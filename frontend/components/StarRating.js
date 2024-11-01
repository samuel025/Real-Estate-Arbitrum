'use client';

import React from 'react';
import { FaStar } from 'react-icons/fa';
import styles from './ReviewModal.module.css';

const StarRating = ({ rating, setRating, hover, setHover }) => {
  return (
    <div className={styles.starRating}>
      {[...Array(5)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <label key={index}>
            <input
              type="radio"
              name="rating"
              value={ratingValue}
              onClick={() => setRating(ratingValue)}
              className={styles.starInput}
            />
            <FaStar
              className={styles.star}
              color={ratingValue <= (hover || rating) ? "#ffc107" : "#e4e5e9"}
              size={25}
              onMouseEnter={() => setHover(ratingValue)}
              onMouseLeave={() => setHover(null)}
            />
          </label>
        );
      })}
    </div>
  );
};

export default StarRating; 