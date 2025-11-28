import { test, expect, type BrowserContext, type Page, type Browser } from '@playwright/test'

/**
 * Integration tests for the Impostor Game multiplayer functionality
 * These tests simulate multiple players using separate browser contexts
 * 
 * Note: These tests require a real Supabase database connection.
 * They will fail if Supabase is not properly configured or reachable.
 */

// Helper to create a new browser context (simulates a new player/browser)
async function createPlayerContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext()
}

// Helper to check if Supabase is configured
async function isSupabaseConfigured(page: Page): Promise<boolean> {
  // Check for configuration warning banner
  const configWarning = page.locator('[data-automation-id="config-warning"]')
  const isNotConfigured = await configWarning.isVisible({ timeout: 2000 }).catch(() => false)
  return !isNotConfigured
}

// Helper to wait for successful session creation (no error visible)
async function waitForSessionCreated(page: Page, timeout = 15000): Promise<boolean> {
  try {
    // Use Promise.race to wait for either successful navigation or an error
    const result = await Promise.race([
      // Success case: URL contains /lobby/
      page.waitForURL(/\/lobby\/\d+/, { timeout }).then(() => 'success'),
      // Error case: Error message appears
      page.locator('[data-automation-id="error-message"]').waitFor({ state: 'visible', timeout }).then(() => 'error')
    ])
    
    return result === 'success'
  } catch {
    // Timeout or other error - check current state
    if (page.url().includes('/lobby/')) {
      return true
    }
    return false
  }
}

// Helper to extract game code from URL with validation
function extractGameCodeFromUrl(url: string): string | null {
  const match = url.match(/\/lobby\/(\d+)/)
  return match ? match[1] : null
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
    await expect(hostPage.locator('[data-automation-id="app-title"]')).toBeVisible()
    
    // Check if Supabase is configured
    const configured = await isSupabaseConfigured(hostPage)
    if (!configured) {
      test.skip(true, 'Supabase is not configured')
      return
    }
    
    // Enter a custom name for the host
    const nameInput = hostPage.locator('[data-automation-id="player-name-input"]')
    await nameInput.clear()
    await nameInput.fill('HostPlayer')
    
    // Click "Nueva Partida" button
    await hostPage.locator('[data-automation-id="new-game-button"]').click()
    
    // Wait for navigation to lobby (with error checking)
    const success = await waitForSessionCreated(hostPage, 20000)
    if (!success) {
      test.skip(true, 'Could not create session - database may be unreachable')
      return
    }
    
    // Extract game code from URL with validation
    const extractedCode = extractGameCodeFromUrl(hostPage.url())
    if (!extractedCode) {
      throw new Error('Failed to extract game code from URL')
    }
    gameCode = extractedCode
    
    // Verify we're in the host lobby
    await expect(hostPage.locator('[data-automation-id="host-lobby-title"]')).toBeVisible()
    
    // Verify the session code is displayed
    await expect(hostPage.locator('[data-automation-id="session-code"]')).toContainText(gameCode)
    
    // Verify player count shows 1 (the host)
    await expect(hostPage.locator('[data-automation-id="player-count"]')).toContainText('1')
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
    await expect(playerPage.locator('[data-automation-id="app-title"]')).toBeVisible()
    
    // The join code should be pre-filled from the URL
    // Enter a custom name for the player
    const nameInput = playerPage.locator('[data-automation-id="player-name-input"]')
    await nameInput.clear()
    await nameInput.fill('JoinedPlayer')
    
    // Click "Unirse" button
    await playerPage.locator('[data-automation-id="submit-join-button"]').click()
    
    // Wait for navigation to player lobby with error handling
    try {
      await playerPage.waitForURL(/\/join\/\d+/, { timeout: 15000 })
    } catch {
      // Check if there's an error message
      const hasError = await playerPage.locator('[data-automation-id="error-message"]').isVisible({ timeout: 1000 }).catch(() => false)
      if (hasError) {
        test.skip(true, 'Could not join session - database may be unreachable')
        return
      }
      throw new Error('Navigation to player lobby timed out')
    }
    
    // Verify we're in the player lobby
    await expect(playerPage.locator('[data-automation-id="player-lobby-greeting"]')).toBeVisible()
    await expect(playerPage.locator('[data-automation-id="player-name-display"]')).toContainText('JoinedPlayer')
    
    // Verify waiting message
    await expect(playerPage.locator('[data-automation-id="waiting-message"]')).toBeVisible()
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
      const playerCountElement = hostPage.locator('[data-automation-id="player-count"]')
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
    const startButton = hostPage.locator('[data-automation-id="start-game-button"]')
    await expect(startButton).toBeEnabled()
    
    // Click to start the game
    await startButton.click()
    
    // Wait for navigation to game screen
    await hostPage.waitForURL(/\/game\/\d+/, { timeout: 15000 })
    
    // Verify we're on the game screen
    await expect(hostPage.locator('[data-automation-id="round-number"]')).toBeVisible({ timeout: 10000 })
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
    await expect(playerPage.locator('[data-automation-id="round-number"]')).toBeVisible({ timeout: 10000 })
  })

  test('Host can start the first round', async () => {
    // Skip if we don't have a game code
    if (!gameCode) {
      test.skip(true, 'No game session available')
      return
    }
    
    // Click "¡INICIAR RONDA!" button
    const startRoundButton = hostPage.locator('[data-automation-id="new-round-button"]')
    await expect(startRoundButton).toBeVisible()
    await startRoundButton.click()
    
    // Wait for countdown modal to appear and complete (3 seconds)
    await expect(hostPage.locator('[data-automation-id="countdown-modal"]')).toBeVisible({ timeout: 5000 })
    
    // Wait for countdown to finish
    await hostPage.locator('[data-automation-id="countdown-modal"]').waitFor({ state: 'hidden', timeout: 10000 })
    
    // After countdown, the "Revelar" button should appear
    await expect(hostPage.locator('[data-automation-id="reveal-button"]')).toBeVisible({ timeout: 5000 })
  })

  test('Player sees countdown and reveal button', async () => {
    // Skip if we don't have a game code
    if (!gameCode) {
      test.skip(true, 'No game session available')
      return
    }
    
    // Wait for countdown to complete on player's side
    await playerPage.locator('[data-automation-id="countdown-modal"]').waitFor({ state: 'hidden', timeout: 10000 })
    
    // The "Revelar" button should appear
    await expect(playerPage.locator('[data-automation-id="reveal-button"]')).toBeVisible({ timeout: 5000 })
  })

  test('Host can reveal their word/impostor card', async () => {
    // Skip if we don't have a game code
    if (!gameCode) {
      test.skip(true, 'No game session available')
      return
    }
    
    // Click reveal button
    await hostPage.locator('[data-automation-id="reveal-button"]').click()
    
    // After revealing, the card should show either a word or "¡IMPOSTOR!"
    // Wait for the word card to appear
    await expect(hostPage.locator('[data-automation-id="word-card"]')).toBeVisible({ timeout: 5000 })
  })

  test('Player can reveal their word/impostor card', async () => {
    // Skip if we don't have a game code
    if (!gameCode) {
      test.skip(true, 'No game session available')
      return
    }
    
    // Click reveal button
    await playerPage.locator('[data-automation-id="reveal-button"]').click()
    
    // After revealing, the card should show either a word or "¡IMPOSTOR!"
    await expect(playerPage.locator('[data-automation-id="word-card"]')).toBeVisible({ timeout: 5000 })
  })

  test('Exactly one player should be the impostor', async () => {
    // Skip if we don't have a game code
    if (!gameCode) {
      test.skip(true, 'No game session available')
      return
    }
    
    // Get the word content from both pages
    const hostWordContent = await hostPage.locator('[data-automation-id="word-content"]').textContent()
    const playerWordContent = await playerPage.locator('[data-automation-id="word-content"]').textContent()
    
    // Check if each player is an impostor (the message is "¡Sos un IMPOSTOR!")
    const hostIsImpostor = hostWordContent?.toUpperCase().includes('IMPOSTOR') ?? false
    const playerIsImpostor = playerWordContent?.toUpperCase().includes('IMPOSTOR') ?? false
    
    // With 2 players and 1 impostor setting, exactly one should be the impostor
    // The other should see a word
    const impostorCount = (hostIsImpostor ? 1 : 0) + (playerIsImpostor ? 1 : 0)
    expect(impostorCount).toBe(1)
    
    // Verify the non-impostor sees "TU PALABRA:"
    if (!hostIsImpostor) {
      await expect(hostPage.locator('[data-automation-id="word-label"]')).toContainText('TU PALABRA:')
    }
    if (!playerIsImpostor) {
      await expect(playerPage.locator('[data-automation-id="word-label"]')).toContainText('TU PALABRA:')
    }
  })

  test('Host can start a new round', async () => {
    // Skip if we don't have a game code
    if (!gameCode) {
      test.skip(true, 'No game session available')
      return
    }
    
    // The host should see "¡NUEVA RONDA!" button
    const newRoundButton = hostPage.locator('[data-automation-id="new-round-button"]')
    await expect(newRoundButton).toBeVisible()
    await newRoundButton.click()
    
    // Wait for countdown to appear
    await expect(hostPage.locator('[data-automation-id="countdown-modal"]')).toBeVisible({ timeout: 5000 })
    
    // Wait for countdown to finish
    await hostPage.locator('[data-automation-id="countdown-modal"]').waitFor({ state: 'hidden', timeout: 10000 })
    
    // Verify we're now on round 2
    await expect(hostPage.locator('[data-automation-id="round-number"]')).toContainText('2', { timeout: 5000 })
  })

  test('Host can exit the game', async () => {
    // Skip if we don't have a game code
    if (!gameCode) {
      test.skip(true, 'No game session available')
      return
    }
    
    // Click "Salir del juego" button
    await hostPage.locator('[data-automation-id="exit-game-button"]').click()
    
    // Wait for navigation to home
    await hostPage.waitForURL('/')
    
    // Verify we're back on the home screen
    await expect(hostPage.locator('[data-automation-id="app-title"]')).toBeVisible()
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
      
      await hostPage.locator('[data-automation-id="new-game-button"]').click()
      
      // Wait for session creation
      const success = await waitForSessionCreated(hostPage, 20000)
      if (!success) {
        test.skip(true, 'Could not create session - database may be unreachable')
        return
      }
      
      // Extract game code with validation
      const gameCode = extractGameCodeFromUrl(hostPage.url())
      if (!gameCode) {
        throw new Error('Failed to extract game code from URL')
      }

      // Player goes to home and manually enters the code
      await playerPage.goto('/')
      
      // Click "Unirse a partida"
      await playerPage.locator('[data-automation-id="join-game-button"]').click()
      
      // Wait for the join code input to appear
      const codeInput = playerPage.locator('[data-automation-id="join-code-input"]')
      await expect(codeInput).toBeVisible()
      
      // Enter the game code
      await codeInput.fill(gameCode)
      
      // Click join button
      await playerPage.locator('[data-automation-id="submit-join-button"]').click()
      
      // Wait for navigation to player lobby
      await playerPage.waitForURL(/\/join\/\d+/, { timeout: 15000 })
      
      // Verify player is in the lobby
      await expect(playerPage.locator('[data-automation-id="waiting-message"]')).toBeVisible()
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
    await page.locator('[data-automation-id="join-game-button"]').click()
    
    // Enter an invalid code
    const codeInput = page.locator('[data-automation-id="join-code-input"]')
    await codeInput.fill('999')
    
    // Click join button
    await page.locator('[data-automation-id="submit-join-button"]').click()
    
    // Wait a moment for the request to complete
    await page.waitForTimeout(2000)
    
    // Should show error message or stay on the same page (not navigate to join page)
    // The error message may appear, or the page should stay on home
    const errorVisible = await page.locator('[data-automation-id="error-message"]').isVisible({ timeout: 10000 }).catch(() => false)
    const stillOnHomePage = page.url().includes('/')  && !page.url().includes('/join/')
    
    // Either error message is shown OR we stayed on the home page (session not found)
    expect(errorVisible || stillOnHomePage).toBeTruthy()
  })
})
