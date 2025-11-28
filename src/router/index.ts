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
router.beforeEach(async (to, _from, next) => {
  const savedGameCode = localStorage.getItem('gameCode')
  const savedIsHost = localStorage.getItem('isHost') === 'true'
  
  // If going to home but have a saved session, restore it
  if (to.path === '/' && savedGameCode) {
    // Don't redirect if there's a join query parameter (QR code scan)
    if (!to.query.join) {
      // Check if the session has a game in progress
      const { supabase } = await import('../lib/supabase')
      const { data: session } = await supabase
        .from('sessions')
        .select('round_number')
        .eq('code', savedGameCode)
        .single()
      
      // If game is in progress (round_number > 0), redirect to game screen
      if (session && session.round_number > 0) {
        next(`/game/${savedGameCode}`)
        return
      }
      
      // Otherwise, redirect to appropriate lobby
      if (savedIsHost) {
        next(`/host/${savedGameCode}`)
        return
      } else {
        next(`/join/${savedGameCode}`)
        return
      }
    }
  }
  
  // If accessing a player lobby but game is in progress, redirect to game
  if (to.name === 'player' && savedGameCode) {
    const { supabase } = await import('../lib/supabase')
    const { data: session } = await supabase
      .from('sessions')
      .select('round_number')
      .eq('code', savedGameCode)
      .single()
    
    if (session && session.round_number > 0) {
      next(`/game/${savedGameCode}`)
      return
    }
  }
  
  // If accessing a game route without saved session, clear localStorage and handle appropriately
  if ((to.name === 'host' || to.name === 'player' || to.name === 'game') && !savedGameCode) {
    localStorage.removeItem('gameCode')
    localStorage.removeItem('playerId')
    localStorage.removeItem('playerName')
    localStorage.removeItem('isHost')
    
    // If accessing host or player route with a game code, redirect to home with join parameter
    // This makes the host URL shareable - others can join by visiting the host's URL
    const gameCodeFromUrl = to.params.gameCode as string | undefined
    if ((to.name === 'host' || to.name === 'player') && gameCodeFromUrl) {
      next({ path: '/', query: { join: gameCodeFromUrl } })
      return
    }
    
    next('/')
    return
  }
  
  next()
})

export default router
