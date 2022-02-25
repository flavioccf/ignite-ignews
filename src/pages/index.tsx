import Head from 'next/head'
import styles from '../styles/home.module.scss'

export default function Home() {
  return (
    <>
      <Head><title>Home</title></Head>
      <h1 className={styles.title}>Hello You</h1>
    </>
  )
}
