'use client';

import React, { useState } from 'react';
import StarRating from './StarRating';
import styles from './ReviewModal.module.css';

const ReviewModal = ({ isOpen, onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(null);
  const [comment, setComment] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(rating, comment);
    setRating(0);
    setComment('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        <h2>Submit Review</h2>
        <form onSubmit={handleSubmit} className={styles.reviewForm}>
          <div className={styles.ratingContainer}>
            <label>Rating:</label>
            <StarRating
              rating={rating}
              setRating={setRating}
              hover={hover}
              setHover={setHover}
            />
          </div>
          <div className={styles.commentContainer}>
            <label>Comment:</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              placeholder="Write your review here..."
              className={styles.commentInput}
            />
          </div>
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={rating === 0}
          >
            Submit Review
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal; 