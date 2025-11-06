import { createRouter, createWebHistory } from 'vue-router'
import HomeScreen from '../components/HomeScreen.vue'
import HostLobby from '../components/HostLobby.vue'
import PlayerLobby from '../components/PlayerLobby.vue'
import GameScreen from '../components/GameScreen.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeScreen
    },
    {
      path: '/host/:gameCode',
      name: 'host',
      component: HostLobby,
      props: true
    },
    {
      path: '/join/:gameCode',
      name: 'player',
      component: PlayerLobby,
      props: true
    },
    {
      path: '/game/:gameCode',
      name: 'game',
      component: GameScreen,
      props: true
    }
  ]
})

// Navigation guard to restore session
router.beforeEach((to, _from, next) => {
  const savedGameCode = localStorage.getItem('gameCode')
  const savedIsHost = localStorage.getItem('isHost') === 'true'
  
  // If going to home but have a saved session, restore it
  if (to.path === '/' && savedGameCode) {
    // Don't redirect if there's a join query parameter (QR code scan)
    if (!to.query.join) {
      if (savedIsHost) {
        next(`/host/${savedGameCode}`)
        return
      } else {
        next(`/join/${savedGameCode}`)
        return
      }
    }
  }
  
  // If accessing a game route without saved session, clear localStorage and go home
  if ((to.name === 'host' || to.name === 'player' || to.name === 'game') && !savedGameCode) {
    localStorage.removeItem('gameCode')
    localStorage.removeItem('playerId')
    localStorage.removeItem('playerName')
    localStorage.removeItem('isHost')
    next('/')
    return
  }
  
  next()
})

export default router
