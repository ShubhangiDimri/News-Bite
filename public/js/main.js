document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle System
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'dark';
    const sunIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>`;
    const moonIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>`;

    // Apply saved theme
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (themeToggle) {
        themeToggle.innerHTML = currentTheme === 'dark' ? sunIcon : moonIcon;

        // Theme toggle event
        themeToggle.addEventListener('click', () => {
            const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            themeToggle.innerHTML = newTheme === 'dark' ? sunIcon : moonIcon;
        });
    }

    // Toast notification system
    const showToast = (message, duration = 3000) => {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Trigger reflow
        toast.offsetHeight;

        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };

    // Like functionality (with event delegation for dynamically added elements)
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.like-btn')) {
            e.preventDefault();
            const btn = e.target.closest('.like-btn');
            const newsId = btn.dataset.id;

            try {
                const res = await fetch('/api/user/likes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ news_id: newsId })
                });

                const data = await res.json();

                if (res.ok) {
                    btn.classList.toggle('liked');
                    // Update the specific like count element
                    const countSpan = document.getElementById(`likes-count-${newsId}`);
                    if (countSpan) {
                        countSpan.textContent = `${data.totalLikes} Likes`;
                    }
                    showToast(data.message || 'Success');
                } else {
                    showToast(data.message || 'Error liking post');
                }
            } catch (err) {
                console.error(err);
                showToast('Something went wrong');
            }
        }
    });

    // Bookmark functionality (with event delegation)
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.bookmark-btn')) {
            e.preventDefault();
            const btn = e.target.closest('.bookmark-btn');
            const newsId = btn.dataset.id;

            try {
                const res = await fetch('/api/user/bookmarks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ news_id: newsId })
                });

                const data = await res.json();

                if (res.ok) {
                    btn.classList.toggle('active');
                    showToast(data.message);
                } else {
                    showToast(data.message || 'Error bookmarking');
                }
            } catch (err) {
                console.error(err);
                showToast('Something went wrong');
            }
        }
    });

    // Comment functionality
    document.querySelectorAll('.comment-input-group').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newsId = form.dataset.id;
            const input = form.querySelector('.comment-input');
            const comment = input.value.trim();

            if (!comment) return;

            try {
                const res = await fetch('/api/user/comments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ news_id: newsId, comment })
                });

                const data = await res.json();

                if (res.ok) {
                    showToast('Comment added');
                    // Reload the page to show the new comment and ensure persistence
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                } else {
                    showToast(data.message || 'Error adding comment');
                }
            } catch (err) {
                console.error(err);
                showToast('Something went wrong');
            }
        });
    });

    // Vote functionality
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.vote-btn');
        if (btn) {
            e.preventDefault();
            const newsId = btn.dataset.newsId;
            const commentId = btn.dataset.commentId;
            const replyId = btn.dataset.replyId;
            const voteType = btn.dataset.type;
            const isReply = !!replyId;

            const endpoint = isReply ? '/api/user/replies/vote' : '/api/user/comments/vote';
            const body = { news_id: newsId, commentId, voteType };
            if (isReply) body.replyId = replyId;

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                const data = await res.json();

                if (res.ok) {
                    const parent = btn.parentNode;
                    const upBtn   = parent.querySelector('.upvote-btn');
                    const downBtn = parent.querySelector('.downvote-btn');
                    const upCount   = parent.querySelector('.vote-count.up');
                    const downCount = parent.querySelector('.vote-count.down');

                    if (data.upvoted)   upBtn.classList.add('active');
                    else                upBtn.classList.remove('active');
                    if (data.downvoted) downBtn.classList.add('active');
                    else                downBtn.classList.remove('active');

                    if (upCount   && data.upvotes   != null) upCount.textContent   = data.upvotes;
                    if (downCount && data.downvotes != null) downCount.textContent = data.downvotes;
                } else {
                    showToast(data.message || 'Error voting');
                }
            } catch (err) {
                console.error(err);
                showToast('Something went wrong');
            }
        }
    });

    // Load More Comments
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('load-more-comments-btn')) {
            const btn = e.target;
            const newsId = btn.dataset.newsId;
            const offset = parseInt(btn.dataset.offset);

            try {
                const allRes = await fetch(`/api/user/comments/${newsId}?limit=100`);
                const allData = await allRes.json();

                if (allRes.ok) {
                    const commentsList = document.getElementById(`comments-${newsId}`);
                    const remaining = allData.comments.slice(offset);

                    remaining.forEach(comment => {
                        const div = document.createElement('div');
                        div.className = 'comment-item';
                        div.id = `comment-${comment._id}`;

                        // Build upvotes and downvotes check
                        const isUpvoted = comment.upvotes && comment.upvotes.includes(window.currentUserId) ? 'active' : '';
                        const isDownvoted = comment.downvotes && comment.downvotes.includes(window.currentUserId) ? 'active' : '';

                        // Build replies HTML
                        let repliesHTML = '';
                        if (comment.replies && comment.replies.length > 0) {
                            repliesHTML = '<div class="replies-list" style="margin-left: 1rem; margin-top: 0.5rem; border-left: 2px solid var(--glass-border); padding-left: 0.5rem;">';
                            comment.replies.forEach(reply => {
                                const isReplyUpvoted = reply.upvotes && reply.upvotes.includes(window.currentUserId) ? 'active' : '';
                                const isReplyDownvoted = reply.downvotes && reply.downvotes.includes(window.currentUserId) ? 'active' : '';

                                repliesHTML += `
                                    <div class="reply-item" id="reply-${reply._id}" style="margin-bottom: 0.5rem;">
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <span style="color: var(--primary-color); font-size: 0.8rem">${reply.username}:</span>
                                            <div class="reply-actions" style="display: flex; gap: 0.3rem; align-items: center;">
                                                <button class="vote-btn upvote-btn small ${isReplyUpvoted}" data-news-id="${newsId}" data-comment-id="${comment._id}" data-reply-id="${reply._id}" data-type="up">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                                                </button>
                                                <span class="vote-count up small">${reply.upvotes ? reply.upvotes.length : 0}</span>
                                                <button class="vote-btn downvote-btn small ${isReplyDownvoted}" data-news-id="${newsId}" data-comment-id="${comment._id}" data-reply-id="${reply._id}" data-type="down">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>
                                                </button>
                                                <span class="vote-count down small">${reply.downvotes ? reply.downvotes.length : 0}</span>
                                                ${reply.userId && reply.userId.toString() === window.currentUserId ? `
                                                <button class="delete-btn" data-news-id="${newsId}" data-comment-id="${comment._id}" data-reply-id="${reply._id}" title="Delete reply" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0.2rem; margin-left: 0.2rem;">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                </button>
                                                ` : ''}
                                            </div>
                                        </div>
                                        <div style="font-size: 0.9rem; color: var(--text-muted);">${reply.comment}</div>
                                    </div>
                                `;
                            });
                            repliesHTML += '</div>';
                        }

                        div.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <span class="comment-user">${comment.username}</span>
                                <div class="comment-actions" style="display: flex; gap: 0.2rem; align-items: center;">
                                    <button class="vote-btn upvote-btn ${isUpvoted}" data-news-id="${newsId}" data-comment-id="${comment._id}" data-type="up">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                                    </button>
                                    <span class="vote-count up">${comment.upvotes ? comment.upvotes.length : 0}</span>
                                    <button class="vote-btn downvote-btn ${isDownvoted}" data-news-id="${newsId}" data-comment-id="${comment._id}" data-type="down">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>
                                    </button>
                                    <span class="vote-count down">${comment.downvotes ? comment.downvotes.length : 0}</span>
                                    <button class="reply-toggle-btn" data-id="${comment._id}">Reply</button>
                                    ${comment.userId === window.currentUserId ? `
                                    <button
                                        class="delete-btn"
                                        data-news-id="${newsId}"
                                        data-comment-id="${comment._id}"
                                        title="Delete comment"
                                        style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0.2rem; margin-left: 0.2rem;"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="comment-text">${comment.comment}</div>
                            ${repliesHTML}
                            <form class="reply-form" id="reply-form-${comment._id}" data-news-id="${newsId}" data-comment-id="${comment._id}" style="display: none; margin-top: 0.5rem;">
                                <div style="display: flex; gap: 0.5rem;">
                                    <input type="text" class="reply-input form-input" placeholder="Write a reply..." required />
                                    <button type="submit" class="btn btn-primary">Reply</button>
                                </div>
                            </form>
                        `;
                        commentsList.insertBefore(div, btn);
                    });
                    btn.remove(); // Remove button after loading all
                }
            } catch (err) {
                console.error(err);
                showToast('Error loading more comments');
            }
        }
    });

    // Reply Toggle (Delegated)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('reply-toggle-btn')) {
            e.preventDefault();
            const btn = e.target;
            const commentId = btn.dataset.id;
            // Find form relative to button or by ID
            // The button is inside .comment-actions or .comment-item
            // The form is inside .comment-item
            const commentItem = btn.closest('.comment-item');
            const form = commentItem.querySelector('.reply-form');

            if (form) {
                form.style.display = form.style.display === 'none' ? 'block' : 'none';
            }
        }
    });

    // Delete functionality (Delegated)
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-btn');
        if (btn) {
            e.preventDefault();
            if (!confirm('Are you sure you want to delete this?')) return;

            const newsId = btn.dataset.newsId;
            const commentId = btn.dataset.commentId;
            const replyId = btn.dataset.replyId;
            const isReply = !!replyId;

            const endpoint = isReply
                ? `/api/user/comments/${commentId}/replies/${replyId}`
                : `/api/user/comments/${commentId}`;

            try {
                const res = await fetch(endpoint, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ news_id: newsId })
                });

                const data = await res.json();

                if (res.ok) {
                    const item = isReply ? document.getElementById(`reply-${replyId}`) : document.getElementById(`comment-${commentId}`);
                    if (item) item.remove();
                    showToast(data.message || 'Deleted successfully');
                } else {
                    showToast(data.message || 'Error deleting');
                }
            } catch (err) {
                console.error(err);
                showToast('Something went wrong');
            }
        }
    });

    // Reply Submission (Delegated)
    document.addEventListener('submit', async (e) => {
        if (e.target.classList.contains('reply-form')) {
            e.preventDefault();
            const form = e.target;
            const newsId = form.dataset.newsId;
            const commentId = form.dataset.commentId;
            const input = form.querySelector('.reply-input');
            const comment = input.value.trim();

            if (!comment) return;

            try {
                const res = await fetch(`/api/user/comments/${commentId}/replies`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ news_id: newsId, comment })
                });

                const data = await res.json();

                if (res.ok) {
                    showToast('Reply added');
                    // Reload the page to show the new reply and ensure persistence
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                } else {
                    showToast(data.message || 'Error adding reply');
                }
            } catch (err) {
                console.error(err);
                showToast('Something went wrong');
            }
        }
    });
});
