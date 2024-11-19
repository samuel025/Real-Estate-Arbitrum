"use client";

import Link from 'next/link';
import styles from './Navbar.module.css';
import { useAppContext } from '@/context';
import { useState, useRef, useEffect } from 'react';
import { FaUserCircle, FaBars, FaTimes } from 'react-icons/fa';

export default function Navbar() {
  const { address, userBalance, connect, disconnect, isConnecting } = useAppContext();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContent}>
        <Link href="/" className={styles.logo}>
          RealEstate
        </Link>

        <button 
          className={styles.hamburger}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <div className={`${styles.navLinks} ${isMobileMenuOpen ? styles.mobileOpen : ''}`} ref={mobileMenuRef}>
          <Link href="/" className={styles.navLink} onClick={() => setIsMobileMenuOpen(false)}>
            Home
          </Link>
          <Link href="/listproperty" className={styles.navLink} onClick={() => setIsMobileMenuOpen(false)}>
            List Property
          </Link>
          <Link href="/marketplace" className={styles.navLink} onClick={() => setIsMobileMenuOpen(false)}>
            Marketplace
          </Link>
          
          <div className={styles.walletSection}>
            {!address ? (
              <button 
                onClick={async () => {
                  try {
                    await connect();
                    setIsMobileMenuOpen(false);
                  } catch (error) {
                    console.error('Navbar connection error:', error);
                  }
                }} 
                className={styles.connectButton}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <>
                <div className={styles.walletInfo}>
                  <span className={styles.balanceAmount}>
                    {Number(userBalance).toFixed(3)} ETH
                  </span>
                  <span className={styles.addressText}>
                    {`${address.slice(0, 6)}...${address.slice(-4)}`}
                  </span>
                </div>
                <div className={styles.profileContainer} ref={menuRef}>
                  <button 
                    className={styles.profileButton}
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                  >
                    <div className={styles.profileIcon}>
                      <FaUserCircle />
                    </div>
                  </button>

                  {showProfileMenu && (
                    <div className={styles.profileMenu}>
                      <Link href="/mypropertylist" className={styles.menuItem} onClick={() => setIsMobileMenuOpen(false)}>
                        My Properties
                      </Link>
                      <Link href="/myinvestments" className={styles.menuItem} onClick={() => setIsMobileMenuOpen(false)}>
                        My Investments
                      </Link>
                      <button 
                        onClick={() => {
                          disconnect();
                          setIsMobileMenuOpen(false);
                        }} 
                        className={styles.disconnectButton}
                      >
                        Disconnect
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 