/**
 * AppearanceSettingsPage
 *
 * Visual customization settings: theme mode, color theme, font,
 * workspace-specific theme overrides, and CLI tool icon mappings.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, type LanguageCode } from '@craft-agent/shared/i18n'
import type { ColumnDef } from '@tanstack/react-table'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { ScrollArea } from '@/components/ui/scroll-area'
import { HeaderMenu } from '@/components/ui/HeaderMenu'
import { EditPopover, EditButton, getEditConfig } from '@/components/ui/EditPopover'
import { useTheme } from '@/context/ThemeContext'
import { useAppShellContext } from '@/context/AppShellContext'
import { routes } from '@/lib/navigate'
import { Monitor, Sun, Moon, ChevronDown, RotateCcw } from 'lucide-react'
import type { DetailsPageMeta } from '@/lib/navigation-registry'
import type { ToolIconMapping } from '../../../shared/types'

import {
  SettingsSection,
  SettingsCard,
  SettingsRow,
  SettingsSegmentedControl,
  SettingsMenuSelect,
  SettingsToggle,
} from '@/components/settings'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import * as storage from '@/lib/local-storage'
import { useWorkspaceIcons } from '@/hooks/useWorkspaceIcon'
import { Info_DataTable, SortableHeader } from '@/components/info/Info_DataTable'
import { Info_Badge } from '@/components/info/Info_Badge'
import type { PresetTheme } from '@config/theme'
import type { FontPreset } from '@/context/ThemeContext'

interface QueryLocalFontsAPI {
  queryLocalFonts(): Promise<Array<{ family: string }>>
}

export const meta: DetailsPageMeta = {
  navigator: 'settings',
  slug: 'appearance',
}

// ============================================
// Tool Icons Table
// ============================================

/**
 * Column definitions for the tool icon mappings table.
 * Shows a preview icon, tool name, and the CLI commands that trigger it.
 */
const getToolIconColumns = (t: (key: string) => string): ColumnDef<ToolIconMapping>[] => [
  {
    accessorKey: 'iconDataUrl',
    header: () => <span className="p-1.5 pl-2.5">{t("settings.appearance.iconHeader")}</span>,
    cell: ({ row }) => (
      <div className="p-1.5 pl-2.5">
        <img
          src={row.original.iconDataUrl}
          alt={row.original.displayName}
          className="w-5 h-5 object-contain"
        />
      </div>
    ),
    size: 60,
    enableSorting: false,
  },
  {
    accessorKey: 'displayName',
    header: ({ column }) => <SortableHeader column={column} title={t("settings.appearance.toolHeader")} />,
    cell: ({ row }) => (
      <div className="p-1.5 pl-2.5 font-medium">
        {row.original.displayName}
      </div>
    ),
    size: 150,
  },
  {
    accessorKey: 'commands',
    header: () => <span className="p-1.5 pl-2.5">{t("settings.appearance.commandsHeader")}</span>,
    cell: ({ row }) => (
      <div className="p-1.5 pl-2.5 flex flex-wrap gap-1">
        {row.original.commands.map(cmd => (
          <Info_Badge key={cmd} color="muted" className="font-mono">
            {cmd}
          </Info_Badge>
        ))}
      </div>
    ),
    meta: { fillWidth: true },
    enableSorting: false,
  },
]

// ============================================
// Main Component
// ============================================

export default function AppearanceSettingsPage() {
  const { t, i18n } = useTranslation()
  const toolIconColumns = useMemo(() => getToolIconColumns(t), [t])

  const {
    mode,
    setMode,
    colorTheme,
    setColorTheme,
    font,
    setFont,
    fontPreset,
    setFontPreset,
    activeWorkspaceId,
    setWorkspaceColorTheme,
    themeLoadError,
    themeResolvedFrom,
  } = useTheme()
  const { workspaces } = useAppShellContext()

  // Fetch workspace icons as data URLs (file:// URLs don't work in renderer)
  const workspaceIconMap = useWorkspaceIcons(workspaces)

  // Preset themes for the color theme dropdown
  const [presetThemes, setPresetThemes] = useState<PresetTheme[]>([])

  // Per-workspace theme overrides (workspaceId -> themeId or undefined)
  const [workspaceThemes, setWorkspaceThemes] = useState<Record<string, string | undefined>>({})

  // Tool icon mappings loaded from main process
  const [toolIcons, setToolIcons] = useState<ToolIconMapping[]>([])

  // Resolved path to tool-icons.json (needed for EditPopover and "Edit File" action)
  const [toolIconsJsonPath, setToolIconsJsonPath] = useState<string | null>(null)

  // Connection icon visibility toggle
  const [showConnectionIcons, setShowConnectionIcons] = useState(() =>
    storage.get(storage.KEYS.showConnectionIcons, true)
  )
  const handleConnectionIconsChange = useCallback((checked: boolean) => {
    setShowConnectionIcons(checked)
    storage.set(storage.KEYS.showConnectionIcons, checked)
  }, [])

  // System font picker state
  const [systemFonts, setSystemFonts] = useState<string[]>([])
  const [fontQuery, setFontQuery] = useState('')
  const [fontOpen, setFontOpen] = useState(false)
  const hasQueriedFonts = useRef(false)

  useEffect(() => {
    if (fontPreset !== 'custom') return
    if (hasQueriedFonts.current) return
    const win = window as unknown as Window & QueryLocalFontsAPI
    if (!('queryLocalFonts' in win)) return
    win.queryLocalFonts()
      .then((fonts) => {
        const families = Array.from(new Set(fonts.map((f) => f.family))).sort()
        hasQueriedFonts.current = true
        setSystemFonts(families)
      })
      .catch(() => {
        // Permission denied or API unavailable — leave list empty
      })
  }, [fontPreset])

  const filteredFonts = useMemo(() => {
    if (!fontQuery.trim()) return systemFonts.slice(0, 50)
    const q = fontQuery.toLowerCase()
    return systemFonts.filter(f => f.toLowerCase().includes(q)).slice(0, 50)
  }, [systemFonts, fontQuery])

  const passThroughFilter = useCallback(() => 1, [])

  // Zoom level state
  const [zoomFactor, setZoomFactor] = useState(1.0)
  useEffect(() => {
    window.electronAPI?.getZoomFactor?.().then((z) => setZoomFactor(z ?? 1.0))
  }, [])
  const applyZoom = useCallback(async (value: number) => {
    const clamped = Math.min(Math.max(value, 0.5), 3.0)
    setZoomFactor(clamped)
    await window.electronAPI?.setZoomFactor?.(clamped)
  }, [])

  const handleFontSearchEnter = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && fontQuery.trim()) {
      setFont(fontQuery.trim())
      setFontOpen(false)
      setFontQuery('')
    }
  }, [fontQuery, setFont])

  // Rich tool descriptions toggle (persisted in config.json, read by SDK subprocess)
  const [richToolDescriptions, setRichToolDescriptions] = useState(true)
  useEffect(() => {
    window.electronAPI?.getRichToolDescriptions?.().then(setRichToolDescriptions)
  }, [])
  const handleRichToolDescriptionsChange = useCallback(async (checked: boolean) => {
    setRichToolDescriptions(checked)
    await window.electronAPI?.setRichToolDescriptions?.(checked)
  }, [])

  // Load preset themes on mount
  useEffect(() => {
    const loadThemes = async () => {
      if (!window.electronAPI) {
        setPresetThemes([])
        return
      }
      try {
        const themes = await window.electronAPI.loadPresetThemes()
        setPresetThemes(themes)
      } catch (error) {
        console.error('Failed to load preset themes:', error)
        setPresetThemes([])
      }
    }
    loadThemes()
  }, [])

  // Load workspace themes on mount
  useEffect(() => {
    const loadWorkspaceThemes = async () => {
      if (!window.electronAPI?.getAllWorkspaceThemes) return
      try {
        const themes = await window.electronAPI.getAllWorkspaceThemes()
        setWorkspaceThemes(themes)
      } catch (error) {
        console.error('Failed to load workspace themes:', error)
      }
    }
    loadWorkspaceThemes()
  }, [])

  // Load tool icon mappings and resolve the config file path on mount
  useEffect(() => {
    const load = async () => {
      if (!window.electronAPI) return
      try {
        const [mappings, homeDir] = await Promise.all([
          window.electronAPI.getToolIconMappings(),
          window.electronAPI.getHomeDir(),
        ])
        setToolIcons(mappings)
        setToolIconsJsonPath(`${homeDir}/.craft-agent/tool-icons/tool-icons.json`)
      } catch (error) {
        console.error('Failed to load tool icon mappings:', error)
      }
    }
    load()
  }, [])

  // Handler for workspace theme change
  // Uses ThemeContext for the active workspace (immediate visual update) and IPC for other workspaces
  const handleWorkspaceThemeChange = useCallback(
    async (workspaceId: string, value: string) => {
      // 'default' means inherit from app default (null in storage)
      const themeId = value === 'default' ? null : value

      // If changing the current workspace, use context for immediate update
      if (workspaceId === activeWorkspaceId) {
        setWorkspaceColorTheme(themeId)
      } else {
        // For other workspaces, just persist via IPC
        await window.electronAPI?.setWorkspaceColorTheme?.(workspaceId, themeId)
      }

      // Update local state for UI
      setWorkspaceThemes(prev => ({
        ...prev,
        [workspaceId]: themeId ?? undefined
      }))
    },
    [activeWorkspaceId, setWorkspaceColorTheme]
  )

  // Theme options for dropdowns
  const themeOptions = useMemo(() => [
    { value: 'default', label: t("settings.appearance.useDefault") },
    ...presetThemes
      .filter(t => t.id !== 'default')
      .map(t => ({
        value: t.id,
        label: t.theme.name || t.id,
      })),
  ], [presetThemes, t])

  // Get current app default theme label for display (null when using 'default' to avoid redundant "Use Default (Default)")
  const appDefaultLabel = useMemo(() => {
    if (colorTheme === 'default') return null
    const preset = presetThemes.find(t => t.id === colorTheme)
    return preset?.theme.name || colorTheme
  }, [colorTheme, presetThemes])

  return (
    <div className="h-full flex flex-col">
      <PanelHeader
        title={t("settings.appearance.title")}
        actions={<HeaderMenu route={routes.view.settings('appearance')} helpFeature="themes" />}
      />
      <div className="flex-1 min-h-0 mask-fade-y">
        <ScrollArea className="h-full">
          <div className="px-5 py-7 max-w-3xl mx-auto">
            <div className="space-y-8">

              {/* Default Theme */}
              <SettingsSection title={t("settings.appearance.defaultTheme")}>
                <SettingsCard>
                  <SettingsRow label={t("settings.appearance.mode")}>
                    <SettingsSegmentedControl
                      value={mode}
                      onValueChange={setMode}
                      options={[
                        { value: 'system', label: t("settings.appearance.system"), icon: <Monitor className="w-4 h-4" /> },
                        { value: 'light', label: t("settings.appearance.light"), icon: <Sun className="w-4 h-4" /> },
                        { value: 'dark', label: t("settings.appearance.dark"), icon: <Moon className="w-4 h-4" /> },
                      ]}
                    />
                  </SettingsRow>
                  <SettingsRow label={t("settings.appearance.colorTheme")}>
                    <SettingsMenuSelect
                      value={colorTheme}
                      onValueChange={setColorTheme}
                      options={themeOptions}
                    />
                  </SettingsRow>
                  <SettingsRow label={t("settings.appearance.font")}>
                    <div className="flex flex-col gap-2">
                      <SettingsSegmentedControl
                        value={fontPreset}
                        onValueChange={setFontPreset}
                        options={[
                          { value: 'inter' as const, label: t("settings.appearance.fontInter") },
                          { value: 'system' as const, label: t("settings.appearance.fontSystem") },
                          { value: 'custom' as const, label: t("settings.appearance.fontCustom") }
                        ]}
                      />
                      {fontPreset === 'custom' && (
                        <Popover open={fontOpen} onOpenChange={setFontOpen}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-sm rounded-md border border-border bg-background text-foreground hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring w-full max-w-[240px]"
                            >
                              <span className="truncate">{font || 'Select font...'}</span>
                              <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-[260px]" align="start">
                            <Command filter={passThroughFilter}>
                              <CommandInput
                                placeholder="Search fonts..."
                                value={fontQuery}
                                onValueChange={setFontQuery}
                                onKeyDown={handleFontSearchEnter}
                              />
                              <CommandList>
                                <CommandEmpty className="py-2 text-xs text-center text-muted-foreground">
                                  Press Enter to use “{fontQuery.trim()}”
                                </CommandEmpty>
                                <CommandGroup>
                                  {filteredFonts.map((name) => (
                                    <CommandItem
                                      key={name}
                                      value={name}
                                      onSelect={() => {
                                        setFont(name)
                                        setFontOpen(false)
                                        setFontQuery('')
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <span style={{ fontFamily: name }}>{name}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </SettingsRow>
                  <SettingsRow label={t("settings.appearance.language")}>
                    <SettingsMenuSelect
                      value={(i18n.resolvedLanguage ?? i18n.language) as LanguageCode}
                      onValueChange={(value) => {
                        i18n.changeLanguage(value)
                        window.electronAPI?.changeLanguage?.(value)
                      }}
                      options={Object.entries(LANGUAGES).map(([code, config]) => ({
                        value: code,
                        label: config.nativeName,
                      }))}
                    />
                  </SettingsRow>
                </SettingsCard>
                {themeLoadError && (
                  <p className="mt-2 text-xs text-info">
                    {t("settings.appearance.themeWarning")} {themeLoadError} ({themeResolvedFrom === 'fallback' ? t("settings.appearance.usingBundledFallback") : t("settings.appearance.usingDefaultTheme")})
                  </p>
                )}
              </SettingsSection>

              {/* Workspace Themes */}
              {workspaces.length > 0 && (
                <SettingsSection
                  title={t("settings.appearance.workspaceThemes")}
                  description={t("settings.appearance.workspaceThemesDesc")}
                >
                  <SettingsCard>
                    {workspaces.map((workspace) => {
                      const wsTheme = workspaceThemes[workspace.id]
                      const hasCustomTheme = wsTheme !== undefined
                      return (
                        <SettingsRow
                          key={workspace.id}
                          label={
                            <div className="flex items-center gap-2">
                              {workspaceIconMap.get(workspace.id) ? (
                                <img
                                  src={workspaceIconMap.get(workspace.id)}
                                  alt=""
                                  className="w-4 h-4 rounded object-cover"
                                />
                              ) : (
                                <div className="w-4 h-4 rounded bg-foreground/10" />
                              )}
                              <span>{workspace.name}</span>
                            </div>
                          }
                        >
                          <SettingsMenuSelect
                            value={hasCustomTheme ? wsTheme : 'default'}
                            onValueChange={(value) => handleWorkspaceThemeChange(workspace.id, value)}
                            options={[
                              { value: 'default', label: appDefaultLabel ? t("settings.appearance.useDefaultWithTheme", { theme: appDefaultLabel }) : t("settings.appearance.useDefault") },
                              ...presetThemes
                                .filter(t => t.id !== 'default')
                                .map(t => ({
                                  value: t.id,
                                  label: t.theme.name || t.id,
                                })),
                            ]}
                          />
                        </SettingsRow>
                      )
                    })}
                  </SettingsCard>
                </SettingsSection>
              )}

              {/* Interface */}
              <SettingsSection title={t("settings.appearance.interface")}>
                <SettingsCard>
                  <SettingsToggle
                    label={t("settings.appearance.connectionIcons")}
                    description={t("settings.appearance.connectionIconsDesc")}
                    checked={showConnectionIcons}
                    onCheckedChange={handleConnectionIconsChange}
                  />
                  <SettingsToggle
                    label={t("settings.appearance.richToolDescriptions")}
                    description={t("settings.appearance.richToolDescriptionsDesc")}
                    checked={richToolDescriptions}
                    onCheckedChange={handleRichToolDescriptionsChange}
                  />
                  <SettingsRow
                    label={t("settings.appearance.zoomLevel")}
                    description={t("settings.appearance.zoomLevelDesc")}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => applyZoom(zoomFactor - 0.1)}
                        className="px-2.5 py-1 text-sm rounded-md border border-border bg-background hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring"
                        aria-label={t("settings.appearance.zoomOut")}
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-sm tabular-nums">
                        {Math.round(zoomFactor * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => applyZoom(zoomFactor + 0.1)}
                        className="px-2.5 py-1 text-sm rounded-md border border-border bg-background hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring"
                        aria-label={t("settings.appearance.zoomIn")}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => applyZoom(1.0)}
                        className="ml-1 p-1.5 rounded-md border border-border bg-background hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={t("settings.appearance.zoomReset")}
                        title={t("settings.appearance.zoomReset")}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </SettingsRow>
                </SettingsCard>
              </SettingsSection>

              {/* Tool Icons — shows the command → icon mapping used in turn cards */}
              <SettingsSection
                title={t("settings.appearance.toolIcons")}
                description={t("settings.appearance.toolIconsDesc")}
                action={
                  toolIconsJsonPath ? (
                    <EditPopover
                      trigger={<EditButton />}
                      {...getEditConfig('edit-tool-icons', toolIconsJsonPath)}
                      secondaryAction={{
                        label: t("settings.appearance.editFile"),
                        filePath: toolIconsJsonPath,
                      }}
                    />
                  ) : undefined
                }
              >
                <SettingsCard>
                  <Info_DataTable
                    columns={toolIconColumns}
                    data={toolIcons}
                    searchable={{ placeholder: t("settings.appearance.searchTools") }}
                    maxHeight={480}
                    emptyContent={t("settings.appearance.noToolIcons")}
                  />
                </SettingsCard>
              </SettingsSection>

            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
