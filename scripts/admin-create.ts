#!/usr/bin/env tsx
// ============================================
// CLI: Create Super Admin
// ============================================
// Usage: pnpm admin:create

import * as readline from 'readline'
import { connectDB, disconnectDB } from '../lib/db/mongodb'
import { AdminModel } from '../lib/db/models'
import { hashPassword, validatePassword, validateUsername } from '../lib/auth/password'
import { SUPER_ADMIN_PERMISSIONS } from '../constants'

// Load environment variables
import 'dotenv/config'

// ----------------------------------------
// Readline Interface
// ----------------------------------------

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

function questionHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt)
    
    const stdin = process.stdin
    const wasRaw = stdin.isRaw
    stdin.setRawMode?.(true)
    stdin.resume()
    
    let password = ''
    
    const onData = (char: Buffer) => {
      const c = char.toString('utf8')
      
      switch (c) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl-D
          stdin.setRawMode?.(wasRaw)
          stdin.pause()
          stdin.removeListener('data', onData)
          process.stdout.write('\n')
          resolve(password)
          break
        case '\u0003': // Ctrl-C
          process.exit()
          break
        case '\u007F': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1)
            process.stdout.write('\b \b')
          }
          break
        default:
          password += c
          process.stdout.write('*')
          break
      }
    }
    
    stdin.on('data', onData)
  })
}

// ----------------------------------------
// Main Function
// ----------------------------------------

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║     SuiDex Games - Create Super Admin         ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  try {
    // Connect to database
    console.log('Connecting to database...')
    await connectDB()
    console.log('✓ Connected to MongoDB\n')

    // Check if super admin already exists
    const existingSuperAdmin = await AdminModel.findOne({ role: 'super_admin' })
    if (existingSuperAdmin) {
      console.log(`⚠ A super admin already exists: ${existingSuperAdmin.username}`)
      const proceed = await question('Do you want to create another super admin? (y/N): ')
      if (proceed.toLowerCase() !== 'y') {
        console.log('\nOperation cancelled.')
        process.exit(0)
      }
      console.log()
    }

    // Get username
    let username = ''
    while (true) {
      username = await question('Enter username: ')
      username = username.trim().toLowerCase()
      
      const usernameError = validateUsername(username)
      if (usernameError) {
        console.log(`✗ ${usernameError}`)
        continue
      }
      
      const existingUser = await AdminModel.findOne({ username })
      if (existingUser) {
        console.log('✗ Username already exists')
        continue
      }
      
      break
    }

    // Get password
    let password = ''
    while (true) {
      password = await questionHidden('Enter password: ')
      
      const passwordError = validatePassword(password)
      if (passwordError) {
        console.log(`✗ ${passwordError}`)
        continue
      }
      
      const confirmPassword = await questionHidden('Confirm password: ')
      if (password !== confirmPassword) {
        console.log('✗ Passwords do not match')
        continue
      }
      
      break
    }

    console.log('\nCreating super admin...')

    // Hash password and create admin
    const passwordHash = await hashPassword(password)
    
    const admin = new AdminModel({
      username,
      passwordHash,
      role: 'super_admin',
      permissions: SUPER_ADMIN_PERMISSIONS,
      invitedBy: null,
    })
    
    await admin.save()

    console.log('\n╔══════════════════════════════════════════════╗')
    console.log('║            ✓ Super Admin Created!             ║')
    console.log('╚══════════════════════════════════════════════╝')
    console.log(`\n  Username: ${username}`)
    console.log(`  Role:     super_admin`)
    console.log(`\n  You can now login at /admin/login\n`)

  } catch (error) {
    console.error('\n✗ Error:', error)
    process.exit(1)
  } finally {
    rl.close()
    await disconnectDB()
    process.exit(0)
  }
}

// Run
main()
