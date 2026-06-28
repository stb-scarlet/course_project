import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { discussionApi } from '@/api';
import { DiscussionPost } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { Link } from 'react-router-dom';

interface Props { positionId: string; }

export default function DiscussionTab({ positionId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Load initial posts
    discussionApi.list(positionId, { limit: 100 }).then(r => {
      setPosts(r.data.posts);
      setLoading(false);
    });

    // Socket.io for real-time
    const socket = io({ path: '/socket.io', transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('joinPosition', positionId);
    socket.on('newPost', (post: DiscussionPost) => {
      setPosts(prev => {
        if (prev.some(p => p.id === post.id)) return prev;
        return [...prev, post];
      });
    });
    return () => {
      socket.emit('leavePosition', positionId);
      socket.disconnect();
    };
  }, [positionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [posts]);

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      await discussionApi.post(positionId, content);
      setContent('');
    } catch { toast.error(t('common.error')); }
    finally { setPosting(false); }
  };

  const isRecruiter = user?.role === 'RECRUITER' || user?.role === 'ADMIN';

  if (loading) return <div className="text-center py-4"><span className="spinner-border spinner-border-sm text-primary" /></div>;

  return (
    <div>
      {/* Posts */}
      <div style={{ maxHeight: 520, overflowY: 'auto' }} className="mb-4">
        {posts.length === 0 && (
          <div className="text-center text-muted py-5">
            <i className="bi bi-chat-dots fs-2 d-block mb-2" />
            {t('discussion.noPosts')}
          </div>
        )}
        {posts.map(post => {
          const name = post.author.profile
            ? `${post.author.profile.firstName} ${post.author.profile.lastName}`
            : 'User';
          return (
            <div key={post.id} className="discussion-post">
              <div className="d-flex align-items-center gap-2 mb-2">
                {post.author.profile?.photoUrl
                  ? <img src={post.author.profile.photoUrl} alt="" className="rounded-circle" width={28} height={28} style={{ objectFit: 'cover' }} />
                  : <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white"
                      style={{ width: 28, height: 28, fontSize: '0.7rem', flexShrink: 0 }}>
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                }
                <div>
                  {isRecruiter
                    ? <Link to={`/profile/${post.authorId}`} className="fw-semibold small text-decoration-none">{name}</Link>
                    : <span className="fw-semibold small">{name}</span>
                  }
                  <span className={`badge ms-2 ${post.author.role === 'RECRUITER' ? 'bg-primary-subtle text-primary' : post.author.role === 'ADMIN' ? 'bg-danger-subtle text-danger' : 'bg-secondary-subtle text-secondary'}`} style={{ fontSize: '0.65rem' }}>
                    {post.author.role}
                  </span>
                </div>
                <span className="text-muted small ms-auto">
                  {new Date(post.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="prose small">
                <ReactMarkdown>{post.content}</ReactMarkdown>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {user ? (
        <div className="card p-3">
          <textarea
            className="form-control mb-2 font-monospace"
            rows={3}
            placeholder={t('discussion.placeholder')}
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handlePost(); }}
          />
          <div className="d-flex justify-content-between align-items-center">
            <span className="text-muted small">Ctrl+Enter to send · Markdown supported</span>
            <button className="btn btn-primary btn-sm" onClick={handlePost} disabled={posting || !content.trim()}>
              {posting ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-send me-1" />}
              {t('discussion.post')}
            </button>
          </div>
        </div>
      ) : (
        <div className="alert alert-info">
          <Link to="/login">Sign in</Link> to participate in the discussion.
        </div>
      )}
    </div>
  );
}