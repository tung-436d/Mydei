export interface ArchiveSummary {
  archive_id: string; thread_id: string; title: string; forum_name: string;
  scraped_at: string; imported_at: string; total_size: number; format_version: number; thread_count: number;
}
export interface ThreadInfo {
  thread_id: string; title: string; forum_name: string; user_id: string; created_at: number;
  view_num: number; reply_num: number; agree: number; is_share: boolean; share_origin: string;
  forum_avatar: string | null; database_path: string; post_count: number; reply_count: number;
}
export interface ArchiveManifest extends ArchiveSummary {
  threads: ThreadInfo[]; files: { path: string; size: number; sha256?: string; generated?: boolean }[];
}
export interface ContentNode { type: number; text?: string; title?: string; desc?: string; filename?: string; raw_url?: string; [key: string]: unknown }
export interface Post {
  id: string; floor: number; user_id: string; parent_id: string; reply_to_id: string; contents: string;
  create_time: number; is_thread_author: number; nickname: string; username: string; avatar: string | null;
  level: number; ip: string; reply_author: string | null; reply_count: number;
}
export interface PostWithReplies extends Post { replies: Post[] }
export interface PageData { total: number; page: number; posts: PostWithReplies[] }
export interface ReplyData { total: number; page: number; replies: Post[] }
export type ReaderRequest =
  | { id: number; type: 'open'; url: string; threadId: string; maxBytes: number }
  | { id: number; type: 'page'; page: number; authorOnly: boolean }
  | { id: number; type: 'replies'; postId: string; page: number };
export const PAGE_SIZE = 20;
export const REPLY_SIZE = 10;
