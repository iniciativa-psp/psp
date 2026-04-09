'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRightIcon, ChevronDownIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { STRATEGY_LEVEL_LABELS, STRATEGY_STATUS_LABELS } from '@/types'
import type { StrategyTreeNode, StrategyLevel, StrategyStatus } from '@/types'

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const LEVEL_COLORS: Record<StrategyLevel, string> = {
  plan: 'bg-blue-100 text-blue-800 border-blue-200',
  programa: 'bg-green-100 text-green-800 border-green-200',
  proyecto: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  actividad: 'bg-purple-100 text-purple-800 border-purple-200',
}

const STATUS_COLORS: Record<StrategyStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-teal-100 text-teal-800 border-teal-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

const LEVEL_ICONS: Record<StrategyLevel, string> = {
  plan: '📋',
  programa: '📦',
  proyecto: '🔨',
  actividad: '⚡',
}

// ---------------------------------------------------------------------------
// Build tree structure
// ---------------------------------------------------------------------------

interface TreeNodeWithChildren extends StrategyTreeNode {
  children: TreeNodeWithChildren[]
}

function buildTree(nodes: StrategyTreeNode[]): TreeNodeWithChildren[] {
  const map = new Map<string, TreeNodeWithChildren>()
  const roots: TreeNodeWithChildren[] = []

  for (const n of nodes) {
    map.set(n.id, { ...n, children: [] })
  }

  for (const n of map.values()) {
    if (n.parent_id && map.has(n.parent_id)) {
      map.get(n.parent_id)!.children.push(n)
    } else {
      roots.push(n)
    }
  }

  return roots
}

// ---------------------------------------------------------------------------
// Node renderer
// ---------------------------------------------------------------------------

function TreeNode({ node }: { node: TreeNodeWithChildren }) {
  const [open, setOpen] = useState(true)
  const hasChildren = node.children.length > 0

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1.5 px-2 rounded hover:bg-muted/40 transition-colors group"
        style={{ paddingLeft: `${node.depth * 24 + 8}px` }}
      >
        {/* Chevron toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          className="shrink-0 h-5 w-5 flex items-center justify-center rounded hover:bg-muted"
          aria-label={open ? 'Colapsar' : 'Expandir'}
          aria-expanded={open}
          disabled={!hasChildren}
          tabIndex={hasChildren ? 0 : -1}
        >
          {hasChildren ? (
            open ? (
              <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground" />
            )
          ) : (
            <span className="h-3.5 w-3.5 block" />
          )}
        </button>

        {/* Level icon */}
        <span className="text-sm shrink-0" aria-hidden>
          {LEVEL_ICONS[node.level]}
        </span>

        {/* Code */}
        <span className="font-mono text-xs text-muted-foreground shrink-0">{node.code}</span>

        {/* Name (link) */}
        <Link
          href={`/dashboard/estrategia/${node.id}`}
          className="text-sm font-medium hover:underline flex-1 truncate"
        >
          {node.name}
        </Link>

        {/* Level badge */}
        <Badge
          className={`text-[10px] border shrink-0 hidden sm:inline-flex ${LEVEL_COLORS[node.level]}`}
          variant="outline"
        >
          {STRATEGY_LEVEL_LABELS[node.level]}
        </Badge>

        {/* Status badge */}
        <Badge
          className={`text-[10px] border shrink-0 ${STATUS_COLORS[node.status]}`}
          variant="outline"
        >
          {STRATEGY_STATUS_LABELS[node.status]}
        </Badge>
      </div>

      {hasChildren && open && (
        <div>
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface StrategyTreeProps {
  nodes: StrategyTreeNode[]
}

export function StrategyTree({ nodes }: StrategyTreeProps) {
  const roots = buildTree(nodes)

  if (roots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No hay ítems hijo registrados.
      </p>
    )
  }

  return (
    <div className="divide-y">
      {roots.map(root => (
        <TreeNode key={root.id} node={root} />
      ))}
    </div>
  )
}
