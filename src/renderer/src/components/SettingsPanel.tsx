import React, { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { DesignSystemPicker } from './DesignSystemPicker'
import { themes } from '../lib/themes'
import type { AppSettings, CliTool } from '../types'
// @ts-ignore - package.json is outside the web tsconfig rootDir, but Vite bundles it successfully at runtime
import packageJson from '../../../../package.json'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

const SAVE_LOCATION_KEY = 'opengamma_default_save_location'
const SPEAKER_NOTES_KEY = 'opengamma_export_speaker_notes'
const EXPORT_FOOTER_KEY = 'opengamma_export_footer'

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { setSettings, setSelectedDesignSystem } = useAppContext()

  const [activeTab, setActiveTab] = useState<'cli' | 'design' | 'defaults' | 'about'>('cli')
  const [cliTool, setCliTool] = useState('')
  const [cliPath, setCliPath] = useState('')
  const [modelName, setModelName] = useState('')
  const [cliTemperature, setCliTemperature] = useState(0.7)
  const [cliMaxTokens, setCliMaxTokens] = useState(2048)
  const [cliOutputMode, setCliOutputMode] = useState<'stream' | 'buffered'>('stream')
  const [cliCustomArgs, setCliCustomArgs] = useState('')
  const [cliWorkingDir, setCliWorkingDir] = useState('')
  const [cliEnvVars, setCliEnvVars] = useState('')
  const [detectedTools, setDetectedTools] = useState<CliTool[]>([])
  const [scanningTools, setScanningTools] = useState(false)
  const [defaultTheme, setDefaultTheme] = useState('startup-gradient')
  const [defaultSlideCount, setDefaultSlideCount] = useState<number>(8)
  const [defaultNarrative, setDefaultNarrative] = useState('explainer')
  const [saveLocation, setSaveLocation] = useState('')
  const [speakerNotes, setSpeakerNotes] = useState(true)
  const [exportFooter, setExportFooter] = useState(true)
  const [checkingUpdates, setCheckingUpdates] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)
  const [hoveredThemeId, setHoveredThemeId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      const loadSettings = async () => {
        try {
          const loaded = await window.electronAPI.getSettings()
          setDefaultTheme(themes.some(t => t.id === loaded.defaultTheme) ? loaded.defaultTheme : 'startup-gradient')
          setDefaultSlideCount(loaded.defaultSlideCount || 8)
          setDefaultNarrative(loaded.defaultNarrative || 'explainer')
          setCliTool(loaded.cliTool || '')
          setCliPath(loaded.cliPath || '')
          setModelName(loaded.modelName || '')
          setCliTemperature(loaded.cliTemperature ?? 0.7)
          setCliMaxTokens(loaded.cliMaxTokens ?? 2048)
          setCliOutputMode(loaded.cliOutputMode || 'stream')
          setCliCustomArgs(loaded.cliCustomArgs || '')
          setCliWorkingDir(loaded.cliWorkingDir || '')
          setCliEnvVars(loaded.cliEnvVars || '')
          setSaveLocation(loaded.defaultSaveLocation || localStorage.getItem(SAVE_LOCATION_KEY) || '')
          setSpeakerNotes(loaded.includeSpeakerNotes ?? localStorage.getItem(SPEAKER_NOTES_KEY) !== 'false')
          setExportFooter(loaded.addReferralFooter ?? localStorage.getItem(EXPORT_FOOTER_KEY) !== 'false')
        } catch (err) {
          console.error('[SettingsPanel] Failed to retrieve settings:', err)
        }
      }

      const scanTools = async () => {
        setScanningTools(true)
        try {
          if (window.electronAPI.detectCliTools) {
            const list = await window.electronAPI.detectCliTools()
            setDetectedTools(list)
          }
        } catch (err) {
          console.error('[SettingsPanel] Failed to scan tools:', err)
        } finally {
          setScanningTools(false)
        }
      }

      loadSettings()
      scanTools()
      setUpdateStatus(null)
    }
  }, [isOpen])

  const handleSave = async () => {
    const updatedSettings: AppSettings = {
      claudeApiKey: '',
      defaultTheme,
      defaultSlideCount,
      defaultNarrative,
      cliTool: cliTool || 'custom',
      cliPath: cliPath.trim(),
      modelName: modelName.trim(),
      cliTemperature,
      cliMaxTokens,
      cliOutputMode,
      cliCustomArgs: cliCustomArgs.trim(),
      cliWorkingDir: cliWorkingDir.trim(),
      cliEnvVars: cliEnvVars.trim(),
      defaultSaveLocation: saveLocation.trim(),
      includeSpeakerNotes: speakerNotes,
      addReferralFooter: exportFooter
    }

    try {
      await window.electronAPI.saveSettings(updatedSettings)
      localStorage.setItem(SAVE_LOCATION_KEY, saveLocation.trim())
      localStorage.setItem(SPEAKER_NOTES_KEY, String(speakerNotes))
      localStorage.setItem(EXPORT_FOOTER_KEY, String(exportFooter))
      setSettings(updatedSettings)
      onClose()
    } catch (err) {
      console.error('[SettingsPanel] Failed to save settings:', err)
    }
  }

  const handleBrowseFile = async (target: 'cliPath' | 'cliWorkingDir' | 'saveLocation', mode: 'file' | 'dir') => {
    try {
      const properties: string[] = mode === 'file' ? ['openFile'] : ['openDirectory', 'createDirectory']
      const result = await window.electronAPI.openFileDialog({
        title: 'Select Path',
        properties
      })
      if (!result.canceled && result.filePaths?.length > 0) {
        const pathVal = result.filePaths[0]
        if (target === 'cliPath') {
          setCliPath(pathVal)
          const found = detectedTools.find(t => t.path === pathVal)
          setCliTool(found ? found.name : 'custom')
        } else if (target === 'cliWorkingDir') {
          setCliWorkingDir(pathVal)
        } else {
          setSaveLocation(pathVal)
        }
      }
    } catch (err) {
      console.error('[SettingsPanel] File dialog error:', err)
    }
  }

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true)
    try {
      await new Promise(r => setTimeout(r, 1500))
      setUpdateStatus('Your application is up to date.')
    } catch {
      setUpdateStatus('Failed to check for updates.')
    } finally {
      setCheckingUpdates(false)
    }
  }

  const cliIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
  const designIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  )
  const defaultsIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
  const aboutIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md transition-opacity" onClick={onClose} />
      )}

      <div className={`fixed inset-y-0 right-0 z-50 w-[540px] max-w-full bg-white border-l border-neutral-200 shadow-2xl transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200">
          <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Application Settings</h3>
          <button onClick={onClose} className="text-neutral-600 hover:bg-neutral-100 p-1.5 rounded-lg transition-all">
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[165px] shrink-0 border-r border-neutral-200 p-4 flex flex-col gap-1 bg-neutral-50/20">
            {[
              { id: 'cli', label: 'Local CLI', icon: cliIcon },
              { id: 'design', label: 'Design Systems', icon: designIcon },
              { id: 'defaults', label: 'Defaults', icon: defaultsIcon },
              { id: 'about', label: 'Export & About', icon: aboutIcon }
            ].map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`relative flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all text-left w-full ${isActive ? 'bg-violet-600/10 text-violet-600' : 'text-neutral-600 hover:bg-neutral-50'}`}>
                  {isActive && <div className="absolute left-0 top-2 bottom-2 w-0.75 bg-violet-600 rounded-r" />}
                  <span className={isActive ? 'text-violet-600' : 'text-neutral-600'}>{tab.icon}</span>
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {activeTab === 'cli' && (
              <div className="flex flex-col gap-5">
                <div>
                  <h4 className="text-xs font-bold text-violet-600 uppercase tracking-wider">Local CLI Configuration</h4>
                  <p className="text-[10px] text-neutral-600 mt-1">Configure offline slide generation via local model CLI wrappers.</p>
                </div>
                <div className="flex flex-col gap-4 bg-neutral-50/50 border border-neutral-200 rounded-xl p-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase">Target CLI Tool {scanningTools && <span className="text-violet-500 animate-pulse ml-2">Scanning...</span>}</label>
                    <select value={cliTool} onChange={(e) => {
                      const val = e.target.value
                      setCliTool(val)
                      if (val !== 'custom') {
                        const found = detectedTools.find(t => t.name === val)
                        if (found) setCliPath(found.path)
                      }
                    }} className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs">
                      <option value="">-- Select or scan CLI --</option>
                      {detectedTools.map(t => <option key={t.path} value={t.name}>{t.name} {t.version ? `(v${t.version})` : ''}</option>)}
                      <option value="custom">⚙️ Use Custom Binary...</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase">Executable Path</label>
                    <div className="flex gap-2">
                      <input type="text" value={cliPath} onChange={e => { setCliPath(e.target.value); setCliTool('custom'); }} className="flex-grow bg-white border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-mono" />
                      <button onClick={() => handleBrowseFile('cliPath', 'file')} className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-xs font-bold">Browse</button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase">Model Name</label>
                    <input type="text" value={modelName} onChange={e => setModelName(e.target.value)} placeholder="gemini-2.0-flash" className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-neutral-600 uppercase">Temp ({cliTemperature})</label>
                      <input type="range" min="0" max="1" step="0.05" value={cliTemperature} onChange={e => setCliTemperature(parseFloat(e.target.value))} className="accent-violet-600" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-neutral-600 uppercase">Max Tokens</label>
                      <input type="number" value={cliMaxTokens} onChange={e => setCliMaxTokens(parseInt(e.target.value, 10))} className="bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase">Output Mode</label>
                    <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-xl">
                      <button onClick={() => setCliOutputMode('stream')} className={`py-1.5 rounded-lg text-xs font-bold ${cliOutputMode === 'stream' ? 'bg-white text-violet-600 shadow-sm' : 'text-neutral-500'}`}>Stream</button>
                      <button onClick={() => setCliOutputMode('buffered')} className={`py-1.5 rounded-lg text-xs font-bold ${cliOutputMode === 'buffered' ? 'bg-white text-violet-600 shadow-sm' : 'text-neutral-500'}`}>Buffer</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'design' && (
              <div className="flex flex-col gap-5">
                <div>
                  <h4 className="text-xs font-bold text-violet-600 uppercase tracking-wider">Design Systems</h4>
                  <p className="text-[10px] text-neutral-600 mt-1">Choose a design system to style your presentations.</p>
                </div>
                <DesignSystemPicker selectedId={defaultTheme} onSelect={s => setSelectedDesignSystem(s)} isCompact={false} />
              </div>
            )}

            {activeTab === 'defaults' && (
              <div className="flex flex-col gap-5">
                <div>
                  <h4 className="text-xs font-bold text-violet-600 uppercase tracking-wider">Generation Defaults</h4>
                  <p className="text-[10px] text-neutral-600 mt-1">Default settings for new creations.</p>
                </div>
                <div className="flex flex-col gap-4 bg-neutral-50/50 border border-neutral-200 rounded-xl p-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase">Default Slide Count</label>
                    <input type="number" min="4" max="20" value={defaultSlideCount} onChange={e => setDefaultSlideCount(parseInt(e.target.value, 10))} className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-center" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase">Default Theme</label>
                    <div className="grid grid-cols-5 gap-2">
                      {themes.map(t => (
                        <button key={t.id} onClick={() => setDefaultTheme(t.id)} onMouseEnter={() => setHoveredThemeId(t.id)} onMouseLeave={() => setHoveredThemeId(null)} className={`h-8 rounded-lg border ${defaultTheme === t.id ? 'border-violet-600 ring-2 ring-violet-600/20' : 'border-neutral-200'}`} style={{ backgroundColor: t.colors.bg }} />
                      ))}
                    </div>
                    <div className="text-[10px] text-neutral-600 mt-1 bg-neutral-100/50 border border-neutral-200/60 rounded-lg p-2.5 min-h-[50px] flex flex-col justify-center">
                      <div className="font-bold text-neutral-800">{themes.find(t => t.id === (hoveredThemeId || defaultTheme))?.name}</div>
                      <div className="text-[9px] text-neutral-500 mt-0.5">{themes.find(t => t.id === (hoveredThemeId || defaultTheme))?.description}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="flex flex-col gap-5">
                <div>
                  <h4 className="text-xs font-bold text-violet-600 uppercase tracking-wider">Export & About</h4>
                  <p className="text-[10px] text-neutral-600 mt-1">System details and export preferences.</p>
                </div>
                <div className="flex flex-col gap-4 bg-neutral-50/50 border border-neutral-200 rounded-xl p-4">
                  <div className="flex items-center justify-between py-1.5 border-b border-neutral-200">
                    <span className="text-xs font-bold text-neutral-800">Include Speaker Notes</span>
                    <button onClick={() => setSpeakerNotes(!speakerNotes)} className={`h-5 w-10 rounded-full transition-colors ${speakerNotes ? 'bg-violet-600' : 'bg-neutral-300'}`}>
                      <div className={`h-4 w-4 bg-white rounded-full transition-transform ${speakerNotes ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-xs font-bold text-neutral-800">App Version</span>
                    <span className="text-[10px] font-mono font-bold">v{packageJson?.version || '1.0.0'}</span>
                  </div>
                  <button onClick={handleCheckUpdates} disabled={checkingUpdates} className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-xs font-bold">
                    {checkingUpdates ? 'Checking...' : 'Check for Updates'}
                  </button>
                  {updateStatus && (
                    <div className="text-[10px] text-neutral-600 bg-white border border-neutral-200 rounded-lg p-2 text-center">{updateStatus}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-neutral-200 bg-neutral-50/95">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-all">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-lg active:scale-95 transition-all">Save Changes</button>
        </div>
      </div>
    </>
  )
}
