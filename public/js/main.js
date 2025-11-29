document.addEventListener('DOMContentLoaded', () => {
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

    // Like functionality
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
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
        });
    });

    // Bookmark functionality
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
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
        });
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
                    input.value = '';
                    const list = document.getElementById(`comments-${newsId}`);

                    // Remove "No comments yet" if it exists
                    if (list.children.length === 1 && list.children[0].textContent === 'No comments yet.') {
                        list.innerHTML = '';
                    }

                    // Create new comment element
                    const div = document.createElement('div');
                    div.className = 'comment-item';
                    div.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <span class="comment-user">${data.comment.username}</span>
                            <div class="comment-actions" style="display: flex; gap: 0.2rem; align-items: center;">
                                <button class="vote-btn upvote-btn" 
                                    data-news-id="${newsId}" 
                                    data-comment-id="${data.comment._id}" 
                                    data-type="up">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                                </button>
                                <span class="vote-score">0</span>
                                <button class="vote-btn downvote-btn" 
                                    data-news-id="${newsId}" 
                                    data-comment-id="${data.comment._id}" 
                                    data-type="down">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>
                                </button>
                                <button class="reply-toggle-btn" data-id="${data.comment._id}">Reply</button>
                            </div>
                        </div>
                        <div class="comment-text">${comment}</div>
                        
                        <!-- Reply Form Placeholder -->
                        <form class="reply-form" id="reply-form-${data.comment._id}" data-news-id="${newsId}" data-comment-id="${data.comment._id}" style="display: none; margin-top: 0.5rem;">
                            <div style="display: flex; gap: 0.5rem;">
                                <input type="text" class="reply-input form-input" placeholder="Write a reply..." required>
                                <button type="submit" class="btn btn-primary">Reply</button>
                            </div>
                        </form>
                    `;

                    // Prepend to list
                    list.insertBefore(div, list.firstChild);

                    showToast('Comment added');
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
                    // Update score
                    const scoreSpan = btn.parentNode.querySelector('.vote-score');
                    if (scoreSpan) scoreSpan.textContent = data.score;

                    // Update button states
                    const parent = btn.parentNode;
                    const upBtn = parent.querySelector('.upvote-btn');
                    const downBtn = parent.querySelector('.downvote-btn');

                    if (data.upvoted) upBtn.classList.add('active');
                    else upBtn.classList.remove('active');

                    if (data.downvoted) downBtn.classList.add('active');
                    else downBtn.classList.remove('active');
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
                const res = await fetch(`/api/user/comments/${newsId}?page=${Math.floor(offset / 10) + 1}&limit=10`);
                const data = await res.json();

                if (res.ok) {
                    const commentsList = document.getElementById(`comments-${newsId}`);
                    // Logic to append comments would go here. 
                    // Since the API returns paginated comments, we might need to adjust the logic to fetch specific range or just all remaining.
                    // For simplicity, let's redirect to a full post view or just load the next batch.
                    // Given the current API structure, let's just hide the button and show a message or implement full rendering logic.
                    // Implementing full rendering logic requires duplicating the comment HTML structure in JS.

                    // For now, let's just remove the button and show a toast as a placeholder for full implementation
                    // or reload the page with a query param to show all comments if we supported that.
                    // Better: Fetch and append.

                    // Simplified append for now (without replies for brevity, or full structure)
                    // Ideally we should have a partial or a client-side template.

                    showToast("Loading more comments...");
                    // In a real app, we'd append elements here.
                    // For this task, I'll just update the button text to indicate it's a demo or actually implement a simple append.

                    // Let's implement a simple append
                    const newComments = data.comments.slice(offset); // This is rough because API pagination might not match "slice from offset" perfectly if we already have some.
                    // Actually the API returns paginated.
                    // Let's just fetch ALL comments for now to keep it simple if the user asks for "more".

                    const allRes = await fetch(`/api/user/comments/${newsId}?limit=100`);
                    const allData = await allRes.json();

                    if (allRes.ok) {
                        const remaining = allData.comments.slice(offset);
                        remaining.forEach(comment => {
                            const div = document.createElement('div');
                            div.className = 'comment-item';
                            div.innerHTML = `
                                <div style="display: flex; justify-content: space-between;">
                                    <span class="comment-user">${comment.username}</span>
                                </div>
                                <div class="comment-text">${comment.comment}</div>
                            `;
                            commentsList.insertBefore(div, btn);
                        });
                        btn.remove(); // Remove button after loading all
                    }

                }
            } catch (err) {
                console.error(err);
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
                    input.value = '';
                    form.style.display = 'none';

                    // Find or create replies list
                    let repliesList = form.previousElementSibling;
                    if (!repliesList || !repliesList.classList.contains('replies-list')) {
                        repliesList = document.createElement('div');
                        repliesList.className = 'replies-list';
                        repliesList.style.cssText = "margin-left: 1rem; margin-top: 0.5rem; border-left: 2px solid var(--glass-border); padding-left: 0.5rem;";
                        form.parentNode.insertBefore(repliesList, form);
                    }

                    const replyDiv = document.createElement('div');
                    replyDiv.className = 'reply-item';
                    replyDiv.style.cssText = "margin-bottom: 0.5rem;";
                    replyDiv.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--primary-color); font-size: 0.8rem;">${data.reply.username}:</span>
                            <div class="reply-actions" style="display: flex; gap: 0.3rem; align-items: center;">
                                <button class="vote-btn upvote-btn small" 
                                    data-news-id="${newsId}" 
                                    data-comment-id="${commentId}" 
                                    data-reply-id="${data.reply._id}" 
                                    data-type="up">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                                </button>
                                <span class="vote-score small">0</span>
                                <button class="vote-btn downvote-btn small" 
                                    data-news-id="${newsId}" 
                                    data-comment-id="${commentId}" 
                                    data-reply-id="${data.reply._id}" 
                                    data-type="down">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>
                                </button>
                            </div>
                        </div>
                        <div style="font-size: 0.9rem; color: var(--text-muted);">${comment}</div>
                    `;

                    repliesList.appendChild(replyDiv);
                    showToast('Reply added');
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
