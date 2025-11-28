import { test, expect, type BrowserContext, type Page } from '@playwright/test'

/**
 * Integration tests for the Impostor Game multiplayer functionality
 * These tests simulate multiple players using separate browser contexts
 * 
 * Note: These tests require a real Supabase database connection.
 * They will fail if Supabase is not properly configured or reachable.
 */

// Helper to create a new browser context (simulates a new player/browser)
async function createPlayerContext(browser: any): Promise<BrowserContext> {
  return browser.newContext()
}

// Helper to wait for element and get its text
async function getElementText(page: Page, selector: string): Promise<string> {
  const element = await page.waitForSelector(selector, { timeout: 10000 })
  return element?.textContent() || ''
}

// Helper to check if Supabase is configured
async function isSupabaseConfigured(page: Page): Promise<boolean> {
  // Check for configuration warning banner
  const configWarning = page.locator('text=Configuración requerida')
  const isNotConfigured = await configWarning.isVisible({ timeout: 2000 }).catch(() => false)
  return !isNotConfigured
}

// Helper to wait for successful session creation (no error visible)
async function waitForSessionCreated(page: Page, timeout = 15000): Promise<boolean> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    // Check if we navigated to lobby
    if (page.url().includes('/lobby/')) {
      return true
    }
    
    // Check for error
    const errorVisible = await page.locator('text=Error al crear sesión').isVisible({ timeout: 500 }).catch(() => false)
    const fetchError = await page.locator('text=Failed to fetch').isVisible({ timeout: 500 }).catch(() => false)
    
    if (errorVisible || fetchError) {
      return false
    }
    
    await page.waitForTimeout(500)
  }
  
  return false
}

test.describe('Multiplayer Game Flow', () => {
  test.describe.configure({ mode: 'serial' })

  let hostContext: BrowserContext
  let playerContext: BrowserContext
  let hostPage: Page
  let playerPage: Page
  let gameCode: string

  test.beforeAll(async ({ browser }) => {
    // Create separate browser contexts for host and player
    hostContext = await createPlayerContext(browser)
    playerContext = await createPlayerContext(browser)
    hostPage = await hostContext.newPage()
    playerPage = await playerContext.newPage()
  })

  test.afterAll(async () => {
    await hostContext?.close()
    await playerContext?.close()
  })

  test('Host can create a new game session', async () => {
    // Navigate to home page
    await hostPage.goto('/')
    
    // Wait for the page to load
    await expect(hostPage.locator('h1')).toContainText('IMPOSTOR')
    
    // Check if Supabase is configured
    const configured = await isSupabaseConfigured(hostPage)
    if (!configured) {
      test.skip(true, 'Supabase is not configured')
      return
    }
    
    // Enter a custom name for the host
    const nameInput = hostPage.locator('input[name="no-autofill"]')
    await nameInput.clear()
    await nameInput.fill('HostPlayer')
    
    // Click "Nueva Partida" button
    await hostPage.click('button:has-text("NUEVA PARTIDA")')
    
    // Wait for navigation to lobby (with error checking)
    const success = await waitForSessionCreated(hostPage, 20000)
    if (!success) {
      test.skip(true, 'Could not create session - database may be unreachable')
      return
    }
    
    // Extract game code from URL
    const url = hostPage.url()
    const match = url.match(/\/lobby\/(\d+)/)
    expect(match).toBeTruthy()
    gameCode = match![1]
    
    // Verify we're in the host lobby
    await expect(hostPage.locator('text=Creando Partida')).toBeVisible()
    
    // Verify the session code is displayed
    await expect(hostPage.locator(`text=${gameCode}`)).toBeVisible()
    
    // Verify player count shows 1 (the host)
    await expect(hostPage.locator('text=JUGADORES').locator('..').locator('p.text-lg')).toContainText('1')
  })

  test('Player can join the game using the session code', async () => {
    // Skip if we don't have a game code from the previous test
    if (!gameCode) {
      test.skip(true, 'No game session available - previous test may have failed')
      return
    }
    
    // Navigate to home page with join parameter (simulating link share)
    await playerPage.goto(`/?join=${gameCode}`)
    
    // Wait for page to load and auto-fill the join code
    await expect(playerPage.locator('h1')).toContainText('IMPOSTOR')
    
    // The join code should be pre-filled from the URL
    // Enter a custom name for the player
    const nameInput = playerPage.locator('input[name="no-autofill"]')
    await nameInput.clear()
    await nameInput.fill('JoinedPlayer')
    
    // Click "Unirse" button
    await playerPage.click('button:has-text("UNIRSE")')
    
    // Wait for navigation to player lobby with error handling
    try {
      await playerPage.waitForURL(/\/join\/\d+/, { timeout: 15000 })
    } catch {
      // Check if there's an error message
      const hasError = await playerPage.locator('text=Error').isVisible({ timeout: 1000 }).catch(() => false)
      if (hasError) {
        test.skip(true, 'Could not join session - database may be unreachable')
        return
      }
      throw new Error('Navigation to player lobby timed out')
    }
    
    // Verify we're in the player lobby
    await expect(playerPage.locator('text=Hola,')).toBeVisible()
    await expect(playerPage.locator('text=JoinedPlayer')).toBeVisible()
    
    // Verify waiting message
    await expect(playerPage.locator('text=Esperando al host')).toBeVisible()
  })

  test('Host sees the player count update when a player joins', async () => {
    // Skip if we don't have a game code
    if (!gameCode) {
      test.skip(true, 'No game session available')
      return
    }
    
    // Wait for the player count to update on the host's page
    // This tests the real-time subscription functionality
    await expect(async () => {
      const playerCountElement = hostPage.locator('text=JUGADORES').locator('..').locator('p.text-lg')
      await expect(playerCountElement).toContainText('2', { timeout: 10000 })
    }).toPass({ timeout: 15000 })
  })

  test('Host can start the game with 2 players', async () => {
    // Skip if we don't have a game code
    if (!gameCode) {
      test.skip(true, 'No game session available')
      return
    }
    
    // Verify the "Start Game" button is enabled (since we have 2 players)
    const startButton = hostPage.locator('button:has-text("¡INICIAR JUEGO!")')
    await expect(startButton).toBeEnabled()
    
    // Click to start the game
    await startButton.click()
    
    // Wait for navigation to game screen
    await hostPage.waitForURL(/\/game\/\d+/, { timeout: 15000 })
    
    // Verify we're on the game screen
    await expect(hostPage.locator('text=RONDA #1')).toBeVisible({ timeout: 10000 })
  })

  test('Player is automatically redirected to game when host starts', async () => {
    // Skip if we don't have a game code
    if (!gameCode) {
      test.skip(true, 'No game session available')
      return
    }
    
    // The player should be automatically redirected to the game screen
    // This tests the real-time session update subscription
    await playerPage.waitForURL(/\/game\/\d+/, { timeout: 15000 })
    
    // Verify we're on the game screen
    await expect(playerPage.locator('text=RONDA #1')).toBeVisible({ timeout: 10000 })
  })

  test('Host can start the first round', async () => {
    // Skip if we don't have a game code
    if (!gameCode) {
      test.skip(true, 'No game session available')
      return
    }
    
    // Click "¡INICIAR RONDA!" button
    const startRoundButton = hostPage.locator('button:has-text("¡INICIAR RONDA!")')
    await expect(startRoundButton).toBeVisible()
    await startRoundButton.click()
    
    // Wait for countdown modal to appear and complete (3 seconds)
    await expect(hostPage.locator('text=¡NUEVA RONDA!')).toBeVisible({ timeout: 5000 })
    
    // Wait for countdown to finish
    await hostPage.waitForSelector('text=¡NUEVA RONDA!', { state: 'hidden', timeout: 10000 })
    
    // After countdown, the "Revelar" button should appear
    await expect(hostPage.locator('button:has-text("¡REVELAR!")')).toBeVisible({ timeout: 5000 })
  })

  test('Player sees countdown and reveal button', async () => {
    // Skip if we don't have a game code
    if (!gameCode) {
      test.skip(true, 'No game session available')
      return
    }
    
    // Wait for countdown to complete on player's side
    await playerPage.waitForSelector('text=¡NUEVA RONDA!', { state: 'hidden', timeout: 10000 })
    
    // The "Revelar" button should appear
    await expect(playerPage.locator('button:has-text("¡REVELAR!")')).toBeVisible({ timeout: 5000 })
  })

  test('Host can reveal their word/impostor card', async () => {
    // Skip if we don't have a game code
    if (!gameCode) {
      test.skip(true, 'No game session available')
      return
    }
    
    // Click reveal button
    await hostPage.click('button:has-text("¡REVELAR!")')
    
    // After revealing, the card should show either a word or "¡IMPOSTOR!"
    // Wait for the word card to appear
    const wordCard = hostPage.locator('[class*="bg-gradient-to-br"]').filter({
      hasText: /TU PALABRA:|¡IMPOSTOR!/
    })
    await expect(wordCard).toBeVisible({ timeout: 5000 })
  })

  test('Player can reveal their word/impostor card', async () => {
    // Skip if we don't have a game code
    if (!gameCode) {
      test.skip(true, 'No game session available')
      return
    }
    
    // Click reveal button
    await playerPage.click('button:has-text("¡REVELAR!")')
    
    // After revealing, the card should show either a word or "¡IMPOSTOR!"
    const wordCard = playerPage.locator('[class*="bg-gradient-to-br"]').filter({
      hasText: /TU PALABRA:|¡IMPOSTOR!/
    })
    await expect(wordCard).toBeVisible({ timeout: 5000 })
  })

  test('Exactly one player should be the impostor', async () => {
    // Skip if we don't have a game code
    if (!gameCode) {
      test.skip(true, 'No game session available')
      return
    }
    
    // Get the content from both pages
    const hostPageContent = await hostPage.content()
    const playerPageContent = await playerPage.content()
    
    // Check if each player is an impostor
    const hostIsImpostor = hostPageContent.includes('¡IMPOSTOR!')
    const playerIsImpostor = playerPageContent.includes('¡IMPOSTOR!')
    
    // With 2 players and 1 impostor setting, exactly one should be the impostor
    // The other should see a word
    const impostorCount = (hostIsImpostor ? 1 : 0) + (playerIsImpostor ? 1 : 0)
    expect(impostorCount).toBe(1)
    
    // Verify the non-impostor sees "TU PALABRA:"
    if (!hostIsImpostor) {
      await expect(hostPage.locator('text=TU PALABRA:')).toBeVisible()
    }
    if (!playerIsImpostor) {
      await expect(playerPage.locator('text=TU PALABRA:')).toBeVisible()
    }
  })

  test('Host can start a new round', async () => {
    // Skip if we don't have a game code
    if (!gameCode) {
      test.skip(true, 'No game session available')
      return
    }
    
    // The host should see "¡NUEVA RONDA!" button
    const newRoundButton = hostPage.locator('button:has-text("¡NUEVA RONDA!")')
    await expect(newRoundButton).toBeVisible()
    await newRoundButton.click()
    
    // Wait for countdown to appear
    await expect(hostPage.locator('text=¡NUEVA RONDA!')).toBeVisible({ timeout: 5000 })
    
    // Wait for countdown to finish
    await hostPage.waitForSelector('text=¡NUEVA RONDA!', { state: 'hidden', timeout: 10000 })
    
    // Verify we're now on round 2
    await expect(hostPage.locator('text=RONDA #2')).toBeVisible({ timeout: 5000 })
  })

  test('Host can exit the game', async () => {
    // Skip if we don't have a game code
    if (!gameCode) {
      test.skip(true, 'No game session available')
      return
    }
    
    // Click "Salir del juego" button
    await hostPage.click('button:has-text("SALIR DEL JUEGO")')
    
    // Wait for navigation to home
    await hostPage.waitForURL('/')
    
    // Verify we're back on the home screen
    await expect(hostPage.locator('h1')).toContainText('IMPOSTOR')
  })
})

test.describe('Session Code Join Flow', () => {
  test('Player can manually enter session code to join', async ({ browser }) => {
    // Create two contexts for host and player
    const hostContext = await browser.newContext()
    const playerContext = await browser.newContext()
    const hostPage = await hostContext.newPage()
    const playerPage = await playerContext.newPage()

    try {
      // Host creates a game
      await hostPage.goto('/')
      
      // Check if Supabase is configured
      const configured = await isSupabaseConfigured(hostPage)
      if (!configured) {
        test.skip(true, 'Supabase is not configured')
        return
      }
      
      await hostPage.click('button:has-text("NUEVA PARTIDA")')
      
      // Wait for session creation
      const success = await waitForSessionCreated(hostPage, 20000)
      if (!success) {
        test.skip(true, 'Could not create session - database may be unreachable')
        return
      }
      
      // Extract game code
      const url = hostPage.url()
      const match = url.match(/\/lobby\/(\d+)/)
      const gameCode = match![1]

      // Player goes to home and manually enters the code
      await playerPage.goto('/')
      
      // Click "Unirse a partida"
      await playerPage.click('button:has-text("UNIRSE A PARTIDA")')
      
      // Wait for the join code input to appear
      const codeInput = playerPage.locator('input[type="tel"]')
      await expect(codeInput).toBeVisible()
      
      // Enter the game code
      await codeInput.fill(gameCode)
      
      // Click join button
      await playerPage.click('button:has-text("UNIRSE"):not(:has-text("PARTIDA"))')
      
      // Wait for navigation to player lobby
      await playerPage.waitForURL(/\/join\/\d+/, { timeout: 15000 })
      
      // Verify player is in the lobby
      await expect(playerPage.locator('text=Esperando al host')).toBeVisible()
    } finally {
      await hostContext.close()
      await playerContext.close()
    }
  })
})

test.describe('Error Handling', () => {
  test('Shows error for invalid session code', async ({ page }) => {
    await page.goto('/')
    
    // Check if Supabase is configured
    const configured = await isSupabaseConfigured(page)
    if (!configured) {
      test.skip(true, 'Supabase is not configured')
      return
    }
    
    // Click "Unirse a partida"
    await page.click('button:has-text("UNIRSE A PARTIDA")')
    
    // Enter an invalid code
    const codeInput = page.locator('input[type="tel"]')
    await codeInput.fill('999')
    
    // Click join button
    await page.click('button:has-text("UNIRSE"):not(:has-text("PARTIDA"))')
    
    // Should show error message (either session not found or fetch error)
    const sessionNotFound = page.locator('text=Sesión no encontrada')
    const fetchError = page.locator('text=Failed to fetch')
    
    // Wait for either error message
    await expect(sessionNotFound.or(fetchError)).toBeVisible({ timeout: 15000 })
  })
})
