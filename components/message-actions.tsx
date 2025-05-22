import type { Message } from 'ai';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useCopyToClipboard } from 'usehooks-ts';

import type { Vote } from '@/lib/db/schema';

import { CopyIcon, ThumbDownIcon, ThumbUpIcon } from './icons';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { memo } from 'react';
import equal from 'fast-deep-equal';
import { toast } from 'sonner';

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
}: {
  chatId: string;
  message: Message;
  vote: Vote | undefined;
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();
  const [_, copyToClipboard] = useCopyToClipboard();
  
  const voteQueryKey = [`/api/vote?chatId=${chatId}`];
  
  // Upvote mutation
  const { mutate: upvoteMutation } = useMutation<Response, Error, void, { previousVotes: Array<Vote> | undefined }>({    
    mutationFn: () => 
      fetch('/api/vote', {
        method: 'PATCH',
        body: JSON.stringify({
          chatId,
          messageId: message.id,
          type: 'up',
        }),
      }),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: voteQueryKey });
      
      // Snapshot the previous value
      const previousVotes = queryClient.getQueryData<Array<Vote>>(voteQueryKey);
      
      // Optimistically update to the new value
      queryClient.setQueryData<Array<Vote>>(voteQueryKey, (currentVotes: Array<Vote> | undefined) => {
        if (!currentVotes) return [];

        const votesWithoutCurrent = currentVotes.filter(
          (vote: Vote) => vote.messageId !== message.id,
        );

        return [
          ...votesWithoutCurrent,
          {
            chatId,
            messageId: message.id,
            isUpvoted: true,
          },
        ];
      });
      
      return { previousVotes };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousVotes) {
        queryClient.setQueryData(voteQueryKey, context.previousVotes);
      }
      toast.error('Failed to upvote response.');
    },
    onSuccess: () => {
      toast.success('Upvoted Response!');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure our local data is in sync with the server
      queryClient.invalidateQueries({ queryKey: voteQueryKey });
    },
  });

  // Downvote mutation
  const { mutate: downvoteMutation } = useMutation<Response, Error, void, { previousVotes: Array<Vote> | undefined }>({    
    mutationFn: () => 
      fetch('/api/vote', {
        method: 'PATCH',
        body: JSON.stringify({
          chatId,
          messageId: message.id,
          type: 'down',
        }),
      }),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: voteQueryKey });
      
      // Snapshot the previous value
      const previousVotes = queryClient.getQueryData<Array<Vote>>(voteQueryKey);
      
      // Optimistically update to the new value
      queryClient.setQueryData<Array<Vote>>(voteQueryKey, (currentVotes: Array<Vote> | undefined) => {
        if (!currentVotes) return [];

        const votesWithoutCurrent = currentVotes.filter(
          (vote: Vote) => vote.messageId !== message.id,
        );

        return [
          ...votesWithoutCurrent,
          {
            chatId,
            messageId: message.id,
            isUpvoted: false,
          },
        ];
      });
      
      return { previousVotes };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousVotes) {
        queryClient.setQueryData(voteQueryKey, context.previousVotes);
      }
      toast.error('Failed to downvote response.');
    },
    onSuccess: () => {
      toast.success('Downvoted Response!');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure our local data is in sync with the server
      queryClient.invalidateQueries({ queryKey: voteQueryKey });
    },
  });

  if (isLoading) return null;
  if (message.role === 'user') return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-row gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="py-1 px-2 h-fit text-muted-foreground"
              variant="outline"
              onClick={async () => {
                const textFromParts = message.parts
                  ?.filter((part) => part.type === 'text')
                  .map((part) => part.text)
                  .join('\n')
                  .trim();

                if (!textFromParts) {
                  toast.error("There's no text to copy!");
                  return;
                }

                await copyToClipboard(textFromParts);
                toast.success('Copied to clipboard!');
              }}
            >
              <CopyIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="message-upvote"
              className="py-1 px-2 h-fit text-muted-foreground !pointer-events-auto"
              disabled={vote?.isUpvoted}
              variant="outline"
              onClick={() => {
                upvoteMutation();
              }}
            >
              <ThumbUpIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Upvote Response</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="message-downvote"
              className="py-1 px-2 h-fit text-muted-foreground !pointer-events-auto"
              variant="outline"
              disabled={vote && !vote.isUpvoted}
              onClick={() => {
                downvoteMutation();
              }}
            >
              <ThumbDownIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Downvote Response</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;

    return true;
  },
);
