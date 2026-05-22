import React, { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { DesignSystemPicker } from './DesignSystemPicker'
import type { AppSettings, DetectedCLI } from '../types'
// @ts-ignore - package.json is outside the web tsconfig rootDir, but Vite bundles it successfully at runtime
import packageJson from '../../../../package.json'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { settings, setSettings, setSelectedDesignSystem } = useAppContext()

  const [activeTab, setActiveTab] = useState<'execution' | 'design' | 'export' | 'about'>('execution')
  
  // Execution & Model state
  const [executionMode, setExecutionMode] = useState<'local-cli' | 'anthropic-api'>('local-cli')
  const [selectedCliId, setSelectedCliId] = useState('')
  const [tempApiKey, setTempApiKey] = useState('')
  const [detectedCLIs, setDetectedCLIs] = useState<DetectedCLI[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [testStatus, setTestStatus] = useState<{ valid: boolean; error?: string } | null>(null)
  const [isTestingKey, setIsTestingKey] = useState(false)

  // Design Systems state (Phase 2)
  // Handled by DesignSystemPicker

  // Export & Defaults state
  const [defaultSlideCount, setDefaultSlideCount] = useState(8)
  const [defaultNarrative, setDefaultNarrative] = useState('explainer')
  const [includeSpeakerNotes, setIncludeSpeakerNotes] = useState(true)
  const [addReferralFooter, setAddReferralFooter] = useState(true)

  // About state
  const [appInfo, setAppInfo] = useState<{ version: string; platform: string; arch: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        const loaded = await window.electronAPI.getSettings()
        setExecutionMode(loaded.executionMode)
        setSelectedCliId(loaded.selectedCliId)
        setTempApiKey(loaded.claudeApiKey || '')
        setDefaultSlideCount(loaded.defaultSlideCount)
        setDefaultNarrative(loaded.defaultNarrative)
        setIncludeSpeakerNotes(loaded.includeSpeakerNotes ?? true)
        setAddReferralFooter(loaded.addReferralFooter ?? true)

        const clis = await window.electronAPI.scanCLIs()
        setDetectedCLIs(clis)

        // @ts-ignore - missing on interface but implemented in IPC for this fix
        if (window.electronAPI.getAppInfo) {
           // @ts-ignore
          const info = await window.electronAPI.getAppInfo()
          setAppInfo(info)
        }
      }
      loadData()
    }
  }, [isOpen])

  const handleSave = async () => {
    const updated: AppSettings = {
      ...settings!,
      executionMode,
      selectedCliId,
      claudeApiKey: tempApiKey,
      defaultSlideCount,
      defaultNarrative,
      includeSpeakerNotes,
      addReferralFooter
    }
    await window.electronAPI.saveSettings(updated)
    setSettings(updated)
    onClose()
  }

  const handleRescan = async () => {
    setIsScanning(true)
    const clis = await window.electronAPI.rescanCLIs()
    setDetectedCLIs(clis)
    setIsScanning(false)
  }

  const handleTestKey = async () => {
    setIsTestingKey(true)
    setTestStatus(null)
    try {
      // @ts-ignore
      const result = await window.electronAPI.testApiKey(tempApiKey)
      setTestStatus(result)
    } catch (err: any) {
      setTestStatus({ valid: false, error: err.message })
    } finally {
      setIsTestingKey(false)
    }
  }

  if (!isOpen) return null

  const installedCount = detectedCLIs.filter(c => c.installed).length

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl h-full max-h-[600px] bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-bounce">
        
        {/* Main Body */}
        <div className="flex-1 flex min-h-0">
          
          {/* Left Navigation */}
          <div className="w-[220px] bg-[#141414] border-r border-white/5 p-4 flex flex-col gap-1">
            <div className="px-3 py-2 mb-2">
              <div className="text-[10px] font-bold text-[#e8ff57] uppercase tracking-widest opacity-80">Settings</div>
            </div>
            
            <button 
              onClick={() => setActiveTab('execution')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'execution' ? 'bg-white/5 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <span className="text-lg">⚙</span> Execution & Model
            </button>
            
            <button 
              onClick={() => setActiveTab('design')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'design' ? 'bg-white/5 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <span className="text-lg">🎨</span> Design Systems
            </button>
            
            <button 
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'export' ? 'bg-white/5 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <span className="text-lg">⬇</span> Export & Defaults
            </button>
            
            <button 
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'about' ? 'bg-white/5 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <span className="text-lg">ℹ</span> About
            </button>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#0d0d0d] overflow-y-auto custom-scrollbar p-8">
            
            {activeTab === 'execution' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Execution & Model</h2>
                  <p className="text-sm text-neutral-500">Choose how slides are generated: via local agents or cloud API.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => setExecutionMode('local-cli')}
                    className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${executionMode === 'local-cli' ? 'border-[#e8ff57]/40 bg-[#e8ff57]/5' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                  >
                    <div className="font-bold text-white mb-1">Local CLI</div>
                    <div className="text-xs text-neutral-500">{installedCount} installed agents</div>
                  </div>
                  
                  <div 
                    onClick={() => setExecutionMode('anthropic-api')}
                    className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${executionMode === 'anthropic-api' ? 'border-[#e8ff57]/40 bg-[#e8ff57]/5' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                  >
                    <div className="font-bold text-white mb-1">Anthropic API</div>
                    <div className="text-xs text-neutral-500">Bring your own key</div>
                  </div>
                </div>

                {executionMode === 'local-cli' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Detected Agents</h3>
                      <button 
                        onClick={handleRescan}
                        disabled={isScanning}
                        className="text-xs font-bold text-[#e8ff57] hover:underline disabled:opacity-50"
                      >
                        {isScanning ? 'Scanning...' : 'Rescan PATH'}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {detectedCLIs.map(cli => (
                        <div 
                          key={cli.id}
                          onClick={() => cli.installed && setSelectedCliId(cli.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${!cli.installed ? 'opacity-40 grayscale' : 'cursor-pointer'} ${selectedCliId === cli.id ? 'border-[#e8ff57]/40 bg-[#e8ff57]/5' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                        >
                          <div className={`w-2 h-2 rounded-full ${cli.installed ? 'bg-green-500' : 'bg-neutral-700'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">{cli.name}</div>
                            {cli.version && <div className="text-[10px] text-neutral-500">{cli.version}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Anthropic Settings</h3>
                    <div className="space-y-2">
                      <label className="text-xs text-neutral-500">API Key</label>
                      <div className="flex gap-2">
                        <input 
                          type="password"
                          value={tempApiKey}
                          onChange={(e) => setTempApiKey(e.target.value)}
                          placeholder="sk-ant-..."
                          className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#e8ff57]/50"
                        />
                        <button 
                          onClick={handleTestKey}
                          disabled={isTestingKey || !tempApiKey}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                        >
                          {isTestingKey ? 'Testing...' : 'Test'}
                        </button>
                      </div>
                      {testStatus && (
                        <div className={`text-xs flex items-center gap-2 ${testStatus.valid ? 'text-green-500' : 'text-red-500'}`}>
                          {testStatus.valid ? '✓ Connection successful' : `✕ ${testStatus.error || 'Invalid key'}`}
                        </div>
                      )}
                      <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="block text-[11px] text-[#e8ff57] hover:underline opacity-80">
                        Get your key at console.anthropic.com
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'design' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Design Systems</h2>
                  <p className="text-sm text-neutral-500">Choose the visual aesthetic for your generated slides.</p>
                </div>
                <DesignSystemPicker 
                  selectedId={settings?.defaultTheme} 
                  onSelect={(s) => setSelectedDesignSystem(s)} 
                  isCompact={false} 
                />
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Export & Defaults</h2>
                  <p className="text-sm text-neutral-500">Set your default generation parameters and export preferences.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Default Slide Count</label>
                      <input 
                        type="number"
                        min={4}
                        max={20}
                        value={defaultSlideCount}
                        onChange={(e) => setDefaultSlideCount(parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Default Style</label>
                      <select 
                        value={defaultNarrative}
                        onChange={(e) => setDefaultNarrative(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                      >
                        <option value="explainer">Explainer</option>
                        <option value="pitch">VC Pitch</option>
                        <option value="report">Report</option>
                        <option value="academic">Academic</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                        <span className="text-sm text-white">Include speaker notes</span>
                        <input 
                          type="checkbox" 
                          checked={includeSpeakerNotes}
                          onChange={(e) => setIncludeSpeakerNotes(e.target.checked)}
                          className="accent-[#e8ff57]"
                        />
                     </div>
                     <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                        <span className="text-sm text-white">Add OpenGamma footer</span>
                        <input 
                          type="checkbox" 
                          checked={addReferralFooter}
                          onChange={(e) => setAddReferralFooter(e.target.checked)}
                          className="accent-[#e8ff57]"
                        />
                     </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">About OpenGamma</h2>
                  <p className="text-sm text-neutral-500">Application information and updates.</p>
                </div>

                <div className="p-6 rounded-xl border border-white/5 bg-white/5 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-400">Version</span>
                    <span className="text-sm text-white font-mono">{packageJson.version}</span>
                  </div>
                  {appInfo && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-400">Platform</span>
                        <span className="text-sm text-white capitalize">{appInfo.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-400">Architecture</span>
                        <span className="text-sm text-white">{appInfo.arch}</span>
                      </div>
                    </>
                  )}
                  <div className="pt-4 border-t border-white/5">
                    <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all">
                      Check for updates
                    </button>
                  </div>
                </div>

                <div className="text-center text-[11px] text-neutral-600">
                  Built with Electron, React & Framer Motion. 
                  <br />
                  Copyright © 2026 OpenGamma Team.
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-none h-[72px] bg-[#141414] border-t border-white/5 px-8 flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-neutral-400 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#e8ff57] text-black shadow-lg shadow-[#e8ff57]/10 active:scale-95 transition-all"
          >
            Save Changes
          </button>
        </div>

      </div>
    </div>
  )
}
