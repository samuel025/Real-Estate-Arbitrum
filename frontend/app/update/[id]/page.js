'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context';
import { useParams, useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import styles from './update.module.css';
import Navbar from '@/components/Navbar';

export default function UpdateProperty() {
  const { getSinglePropertyFunction, updatePropertyFunction } = useAppContext();
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    propertyId: '',
    name: '',
    price: '',
    rent: '',
    rentPeriod: '',
    images: '',
    description: '',
    propertyAddress: ''
  });

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const property = await getSinglePropertyFunction(params.id);
        if (property && property[0]) {
          setFormData({
            propertyId: property[0].propertyId,
            name: property[0].title,
            price: ethers.utils.formatEther(property[0].price),
            rent: ethers.utils.formatEther(property[0].rent),
            rentPeriod: property[0].rentPeriod,
            images: property[0].image,
            description: property[0].description,
            propertyAddress: property[0].propertyAddress
          });
        }
      } catch (err) {
        setError('Failed to fetch property details');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchProperty();
    }
  }, [params.id, getSinglePropertyFunction]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const updatedData = {
        ...formData,
        price: ethers.utils.parseEther(formData.price.toString()),
        rent: ethers.utils.parseEther(formData.rent.toString()),
        rentPeriod: parseInt(formData.rentPeriod)
      };

      await updatePropertyFunction(updatedData);
      router.push(`/property/${params.id}`);
    } catch (err) {
      setError('Failed to update property. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.formWrapper}>
          <h1>Update Property</h1>
          
          {error && <div className={styles.error}>{error}</div>}
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Property Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="price">Price (ETH)</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  step="0.001"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="rent">Rent (ETH)</label>
                <input
                  type="number"
                  id="rent"
                  name="rent"
                  value={formData.rent}
                  onChange={handleChange}
                  step="0.001"
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="rentPeriod">Rent Period (days)</label>
              <input
                type="number"
                id="rentPeriod"
                name="rentPeriod"
                value={formData.rentPeriod}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="images">Image URL</label>
              <input
                type="text"
                id="images"
                name="images"
                value={formData.images}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="propertyAddress">Property Address</label>
              <input
                type="text"
                id="propertyAddress"
                name="propertyAddress"
                value={formData.propertyAddress}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.buttonGroup}>
              <button 
                type="button" 
                onClick={() => router.push(`/property/${params.id}`)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Property'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
