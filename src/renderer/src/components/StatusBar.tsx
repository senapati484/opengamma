import React from 'react'
import { useAppContext } from '../context/AppContext'

export const StatusBar: React.FC = () => {
  const { settings } = useAppContext()

  if (!settings) return null

  const isLocal = settings.executionMode === 'local-cli'
  const modeText = isLocal ? 'Local CLI' : 'Anthropic API'
  const agentText = isLocal ? settings.selectedCliId || 'None' : 'Claude'

  return (
    <div className="h-[28px] bg-[#141414] border-t border-white/5 flex items-center px-4 justify-between select-none pointer-events-auto no-drag">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${agentText === 'None' && isLocal ? 'bg-red-500' : 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]'}`}
          />
          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest leading-none mt-0.5">
            {modeText}
          </span>
          <span className="text-neutral-700 font-black text-[9px] uppercase tracking-tighter">
            /
          </span>
          <span className="text-[9px] font-black text-[#e8ff57] uppercase tracking-widest leading-none mt-0.5">
            {agentText}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 h-full">
        <div className="h-3 w-px bg-white/5" />
        <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.2em] leading-none mt-0.5">
          Open Gamma v1.0.0
        </span>
      </div>
    </div>
  )
}
