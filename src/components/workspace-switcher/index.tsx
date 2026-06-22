import { useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'

interface WorkspaceItem {
  id: number
  name: string
}

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceItem[]
  selectedWorkspaceId: number
  onSelect: (workspaceId: number) => void
  onEdit: (workspace: WorkspaceItem) => void
  onCreate: () => void
  onJoin: () => void
}

export default function WorkspaceSwitcher({
  workspaces,
  selectedWorkspaceId,
  onSelect,
  onEdit,
  onCreate,
  onJoin,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false)

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || null,
    [selectedWorkspaceId, workspaces],
  )

  return (
    <View className='workspace-switcher'>
      <Button
        className='workspace-switcher__trigger'
        onClick={() => setOpen((current) => !current)}
      >
        <View className='workspace-switcher__trigger-main'>
          <Text className='workspace-switcher__label'>当前空间</Text>
          <Text className='workspace-switcher__value'>
            {activeWorkspace?.name || '请选择空间'}
          </Text>
        </View>
        <View
          className={`workspace-switcher__chevron ${open ? 'workspace-switcher__chevron--open' : ''}`}
        />
      </Button>

      {open ? (
        <View className='workspace-switcher__menu'>
          {workspaces.map((workspace) => {
            const active = workspace.id === selectedWorkspaceId

            return (
              <View key={workspace.id} className='workspace-switcher__row'>
                <View
                  className={`workspace-switcher__item ${active ? 'workspace-switcher__item--active' : ''}`}
                  onClick={() => {
                    onSelect(workspace.id)
                    setOpen(false)
                  }}
                >
                  <Text className='workspace-switcher__item-text'>{workspace.name}</Text>
                  {active ? <Text className='workspace-switcher__item-meta'>当前</Text> : null}
                </View>
                <Button
                  className='workspace-switcher__edit'
                  onClick={(event) => {
                    event.stopPropagation()
                    setOpen(false)
                    onEdit(workspace)
                  }}
                >
                  <View className='icon-pencil' />
                </Button>
              </View>
            )
          })}

          <View className='workspace-switcher__divider' />

          <View
            className='workspace-switcher__action'
            onClick={() => {
              setOpen(false)
              onCreate()
            }}
          >
            <Text className='workspace-switcher__action-text'>新建空间</Text>
          </View>

          <View
            className='workspace-switcher__action workspace-switcher__action--last'
            onClick={() => {
              setOpen(false)
              onJoin()
            }}
          >
            <Text className='workspace-switcher__action-text'>加入空间</Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}
