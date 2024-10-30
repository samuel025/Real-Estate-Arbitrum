"use client";

import Link from 'next/link';
import styles from './Navbar.module.css';
import { useAppContext } from '../context';

export default function Navbar() {
  const { 
    address, 
    signer,
    connect, 
    disconnect, 
    userBalance,
  } = useAppContext();


  return (
    <nav className={styles.navbar}>
      <div className={styles.navContent}>
        <div className={styles.navLeft}>
          <Link href="/" className={styles.logo}>
            PropertyShare
          </Link>
        </div>
        
        <div className={styles.navLinks}>
          <Link href="/" className={styles.navLink}>
            Home
          </Link>
          <Link href="/listproperty" className={styles.navLink}>
            List Property
          </Link>
          {address && (
            <Link href="/dashboard" className={styles.navLink}>
              Dashboard
            </Link>
          )}
        </div>

        <div className={styles.navRight}>
          {address ? (
            <div className={styles.userSection}>
              <span className={styles.walletAddress}>
                {`${address.slice(0, 6)}...${address.slice(-4)}`}
              </span>
              <span className={styles.balance}>
                {userBalance ? `${Number(userBalance).toFixed(4)} ETH` : '0.0000 ETH'}
              </span>
              <button onClick={disconnect} className={styles.disconnectBtn}>
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={connect} className={styles.connectBtn}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
} 