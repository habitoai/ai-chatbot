import type { Attachment } from 'ai';
import { FileIcon, ImageIcon, LoaderIcon, CrossIcon, WarningIcon } from './icons';
import { Button } from './ui/button';
import { useLocalStorageContext } from './local-storage-context';

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
}: {
  attachment: Attachment & { isOffline?: boolean };
  isUploading?: boolean;
  onRemove?: () => void;
}) => {
  const { name, url, contentType } = attachment;
  const { isOnline } = useLocalStorageContext();
  
  // Get file extension from the name
  const fileExtension = name?.split('.').pop()?.toLowerCase() || '';
  
  // Determine the appropriate icon based on content type
  const getFileIcon = () => {
    if (!contentType) return <FileIcon size={32} />;
    
    if (contentType.startsWith('image')) {
      return <ImageIcon size={32} />;
    } else if (contentType.includes('pdf')) {
      return <FileIcon size={32} />;
    } else if (
      contentType.includes('text') || 
      contentType.includes('javascript') || 
      contentType.includes('json') || 
      contentType.includes('html') || 
      contentType.includes('css') || 
      contentType.includes('python')
    ) {
      return <FileIcon size={32} />;
    } else {
      return <FileIcon size={32} />;
    }
  };

  return (
    <div data-testid="input-attachment-preview" className="flex flex-col gap-2 relative group">
      <div className="w-24 h-20 bg-muted rounded-md relative flex flex-col items-center justify-center p-1 overflow-hidden">
        {contentType && contentType.startsWith('image') ? (
          // NOTE: it is recommended to use next/image for images
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt={name ?? 'An image attachment'}
            className="rounded-md size-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full">
            {getFileIcon()}
            <span className="text-[10px] text-zinc-500 mt-1 uppercase">{fileExtension}</span>
          </div>
        )}

        {isUploading && (
          <div
            data-testid="input-attachment-loader"
            className="animate-spin absolute inset-0 flex items-center justify-center bg-muted/80"
          >
            <LoaderIcon size={24} />
          </div>
        )}
        
        {/* Offline indicator */}
        {!isOnline && attachment.isOffline && (
          <div 
            className="absolute top-1 right-1 bg-amber-500 rounded-full p-0.5"
            title="This file is stored offline"
          >
            <WarningIcon size={14} />
          </div>
        )}
        
        {onRemove && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onRemove}
          >
            <CrossIcon size={12} />
          </Button>
        )}
      </div>
      <div className="text-xs text-zinc-500 max-w-24 truncate flex items-center gap-1">
        {!isOnline && attachment.isOffline && (
          <span className="inline-block w-2 h-2 bg-amber-500 rounded-full" />
        )}
        <span>{name}</span>
      </div>
    </div>
  );
};
