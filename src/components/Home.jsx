import styles from '../Home.module.css'
import {A} from '@solidjs/router'

const Home = () => {
  return (
    <div class={styles.main}>
      <h1>Welcome To Livecast Broadcasting</h1>
      <span>Select What Would You Like To Do:</span>
      <div class={styles.buttons}>
        <A href={'/publish'}><button class={styles.pubVideo}>Publish Stream</button></A>
        <A href={'/stream'}><button class={styles.subVideo}>View Stream</button></A>
      </div>
    </div>
  )
}

export default Home