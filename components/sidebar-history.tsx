'use client';

import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import { useParams, useRouter } from 'next/navigation';
import type { User } from 'next-auth';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import type { Chat } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';
import { ChatItem } from './sidebar-history-item';
import { useInfiniteQuery, useQueryClient, useMutation, InfiniteData } from '@tanstack/react-query';
import { LoaderIcon } from './icons';
import { useLocalStorageContext } from './local-storage-context';
import type { LocalChat } from '@/lib/db/client/database';

type GroupedChats = {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
};

export interface ChatHistory {
  chats: Array<Chat>;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

const groupChatsByDate = (chats: Chat[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return chats.reduce(
    (groups, chat) => {
      const chatDate = new Date(chat.createdAt);

      if (isToday(chatDate)) {
        groups.today.push(chat);
      } else if (isYesterday(chatDate)) {
        groups.yesterday.push(chat);
      } else if (chatDate > oneWeekAgo) {
        groups.lastWeek.push(chat);
      } else if (chatDate > oneMonthAgo) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    } as GroupedChats,
  );
};

export function getChatHistoryPaginationKey(
  pageIndex: number,
  previousPageData: ChatHistory,
) {
  if (previousPageData && previousPageData.hasMore === false) {
    return undefined; // Return undefined instead of null to signal no more pages
  }

  if (pageIndex === 0) return `/api/history?limit=${PAGE_SIZE}`;

  const firstChatFromPage = previousPageData.chats.at(-1);

  if (!firstChatFromPage) return undefined; // Return undefined instead of null

  return `/api/history?ending_before=${firstChatFromPage.id}&limit=${PAGE_SIZE}`;
}

export function SidebarHistory({ user }: { user: User | undefined }) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { state, setOpenMobile } = useSidebar();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const { isOnline, getChats, removeChatAndMessages, isInitialized } = useLocalStorageContext();
  const [localChats, setLocalChats] = useState<LocalChat[]>([]);
  
  // Load local chats when initialized
  useEffect(() => {
    if (isInitialized) {
      getChats().then(setLocalChats).catch(console.error);
    }
  }, [isInitialized, getChats]);
  
  // Get the current chat ID from params
  const id = params?.id;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery<ChatHistory, Error, ChatHistory, string[], string | undefined>({
    queryKey: ['chatHistory'],
    queryFn: async ({ pageParam }) => {
      if (!pageParam) throw new Error('No page param'); 
      return fetcher(pageParam);
    },
    initialPageParam: getChatHistoryPaginationKey(0, null as any), 
    getNextPageParam: (lastPage: ChatHistory, allPages: ChatHistory[]) => { 
      const lastPageIndex = allPages.length -1;
      const key = getChatHistoryPaginationKey(lastPageIndex + 1, lastPage);
      return key ?? undefined; // Return undefined to signal no more pages
    },
  });

  // Explicitly type data as InfiniteData to access pages property
  const infiniteData = data as InfiniteData<ChatHistory, string | undefined> | undefined;
  const paginatedChatHistories = infiniteData?.pages;
  
  // Combine all chats from all pages and local storage
  let allChats = infiniteData
    ? infiniteData.pages.flatMap((page) => page.chats)
    : [];
    
  // If offline or we have local chats, merge them with server chats
  if (!isOnline || localChats.length > 0) {
    // Convert LocalChat to Chat format for display
    const formattedLocalChats = localChats.map(localChat => ({
      id: localChat.id,
      title: localChat.title,
      createdAt: localChat.createdAt,
      userId: localChat.userId,
      visibility: localChat.visibility,
    }));
    
    // Merge and deduplicate chats by ID
    const chatMap = new Map();
    
    // Add server chats first
    allChats.forEach(chat => chatMap.set(chat.id, chat));
    
    // Then add local chats (will override server chats with same ID)
    formattedLocalChats.forEach(chat => chatMap.set(chat.id, chat));
    
    // Convert back to array and sort by createdAt (newest first)
    allChats = Array.from(chatMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } 

  const hasEmptyChatHistory = allChats.length === 0 && !isLoading && !isFetchingNextPage;

  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      if (!isOnline) {
        // If offline, just delete from local storage
        await removeChatAndMessages(chatId);
        return;
      }
      
      // Otherwise, delete from server
      await fetch(`/api/chat`, {
        method: 'DELETE',
        body: JSON.stringify({ id: chatId }),
      }).then(response => {
        if (!response.ok) throw new Error(`Delete failed with ${response.status}`);
      });
      
      // Also delete from local storage to keep in sync
      await removeChatAndMessages(chatId);
    },
    onMutate: async (chatId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['chatHistory'] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<InfiniteData<ChatHistory>>(['chatHistory']);

      // Optimistically update to the new value
      if (previousData) {
        queryClient.setQueryData<InfiniteData<ChatHistory>>(['chatHistory'], (old) => {
          if (!old) return { pages: [], pageParams: [] };
          
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              chats: page.chats.filter(chat => chat.id !== chatId)
            }))
          };
        });
      }
      
      // Also update local chats state
      setLocalChats(prevChats => prevChats.filter(chat => chat.id !== chatId));

      return { previousData };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData<InfiniteData<ChatHistory>>(['chatHistory'], context.previousData);
      }
      
      toast.error('Failed to delete chat. Please try again.');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['chatHistory'] });
    }
  });

  const { mutate: deleteChatMutate, isPending: isDeletingChat } = deleteChatMutation;
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    if (deleteId) {
      deleteChatMutate(deleteId);
    }
  };

  // Check if user is logged in
  if (!user) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            Login to save and revisit previous chats!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
          Today
        </div>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[44, 32, 28, 64, 52].map((item) => (
              <div
                key={item}
                className="rounded-md h-8 flex gap-2 px-2 items-center"
              >
                <div
                  className="h-4 rounded-md flex-1 max-w-[--skeleton-width] bg-sidebar-accent-foreground/10"
                  style={
                    {
                      '--skeleton-width': `${item}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (hasEmptyChatHistory) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            Your conversations will appear here once you start chatting!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {paginatedChatHistories && (
              <div className="flex-1 overflow-y-auto">
                {Object.entries(groupChatsByDate(allChats)).map(([groupName, chatsInGroup]) => {
                  if (chatsInGroup.length === 0) return null;
                  return (
                    <div key={groupName}>
                      <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                        {groupName.charAt(0).toUpperCase() + groupName.slice(1)}
                      </div>
                      {chatsInGroup.map((chat: Chat) => ( 
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          isActive={chat.id === id}
                          onDelete={(chatId) => {
                            setDeleteId(chatId);
                            setShowDeleteDialog(true);
                          }}
                          setOpenMobile={setOpenMobile}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </SidebarMenu>

          <motion.div
            onViewportEnter={() => {
              if (!isFetching && hasNextPage) {
                fetchNextPage();
              }
            }}
          />

          {hasNextPage ? (
            <div className="p-2 text-zinc-500 dark:text-zinc-400 flex flex-row gap-2 items-center mt-8">
              <div className="animate-spin">
                <LoaderIcon />
              </div>
              <div>Loading Chats...</div>
            </div>
          ) : (
            <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2 mt-8">
              You have reached the end of your chat history.
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
