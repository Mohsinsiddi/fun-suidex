import { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { WheelGame } from '@/components/wheel/WheelGame'

export const metadata: Metadata = {
  title: 'Wheel of Victory',
  description: 'Spin the wheel to win Victory tokens, SuiTrump, and more!',
}

export default function WheelPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col">
        <WheelGame />
      </main>
    </div>
  )
}
