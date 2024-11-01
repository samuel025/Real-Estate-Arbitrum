"use client";

import Link from 'next/link';
import styles from './Navbar.module.css';
import { useAppContext } from '@/context';
import { useState, useRef } from 'react';
import { FaUserCircle } from 'react-icons/fa'

export default function Navbar() {
  const { address, userBalance, connect, disconnect } = useAppContext();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef(null);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContent}>
        <Link href="/" className={styles.logo}>
          RealEstate
        </Link>

        <div className={styles.navLinks}>
          <Link href="/" className={styles.navLink}>
            Home
          </Link>
          <Link href="/listproperty" className={styles.navLink}>
            List Property
          </Link>
          
          <div className={styles.walletSection}>
            {!address ? (
              <button onClick={connect} className={styles.connectButton}>
                Connect Wallet
              </button>
            ) : (
              <>
                <div className={styles.walletInfo}>
                  <span className={styles.balanceAmount}>{userBalance} ETH</span>
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
                      {/* {address.slice(0, 2)} */}
                      <FaUserCircle  />
                    </div>
                  </button>

                  {showProfileMenu && (
                    <div className={styles.profileMenu}>
                      <Link href="/mypropertylist" className={styles.menuItem}>
                        My Properties
                      </Link>
                      <Link href="/myinvestments" className={styles.menuItem}>
                        My Investments
                      </Link>
                      <button 
                        onClick={disconnect} 
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