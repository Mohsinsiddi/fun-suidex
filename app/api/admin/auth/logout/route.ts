// ============================================
// Admin Logout API
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db/mongodb'
import { AdminModel } from '@/lib/db/models'
import { verifyAdminToken } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('admin_token')?.value

    if (token) {
      const payload = await verifyAdminToken(token)
      
      if (payload) {
        // Remove session from database
        await connectDB()
        await AdminModel.updateOne(
          { username: payload.username },
          { $pull: { sessions: { sessionId: payload.sessionId } } }
        )
      }
    }

    // Clear cookie
    cookieStore.delete('admin_token')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin logout error:', error)
    // Still clear cookie even on error
    const cookieStore = cookies()
    cookieStore.delete('admin_token')
    return NextResponse.json({ success: true })
  }
}
