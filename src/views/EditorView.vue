<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import {
  MousePointer2,
  Circle,
  Minus,
  Triangle,
  ArrowDown,
  Save,
  FolderOpen,
  Trash2,
  Calculator,
} from 'lucide-vue-next'

const { t } = useI18n()
</script>

<template>
  <TooltipProvider>
    <div class="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <!-- Header -->
      <header class="flex items-center justify-between h-12 px-4 border-b bg-card shrink-0">
        <div class="flex items-center gap-3">
          <span class="font-bold text-lg text-primary">{{ t('app.name') }}</span>
          <Separator orientation="vertical" class="h-6" />
          <input
            type="text"
            value="Nowy projekt"
            class="bg-transparent border-none text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring rounded px-2 py-1 w-48"
          />
        </div>
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Save class="w-4 h-4 mr-1" />
            {{ t('header.save') }}
          </Button>
          <Button variant="ghost" size="sm">
            <FolderOpen class="w-4 h-4 mr-1" />
            {{ t('header.projects') }}
          </Button>
          <Button variant="ghost" size="sm">
            <Trash2 class="w-4 h-4 mr-1" />
            {{ t('header.clearCanvas') }}
          </Button>
          <Separator orientation="vertical" class="h-6" />
          <Button variant="default" size="sm" class="bg-green-600 hover:bg-green-700 text-white">
            <Calculator class="w-4 h-4 mr-1" />
            {{ t('header.calculate') }}
          </Button>
        </div>
      </header>

      <div class="flex flex-1 overflow-hidden">
        <!-- Left Sidebar / Toolbar -->
        <aside class="flex flex-col w-12 border-r bg-card shrink-0 py-2 gap-1 items-center">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon" class="w-9 h-9">
                <MousePointer2 class="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{{ t('tools.select') }} ({{ t('toolShortcuts.select') }})</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon" class="w-9 h-9">
                <Circle class="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{{ t('tools.addNode') }} ({{ t('toolShortcuts.addNode') }})</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon" class="w-9 h-9">
                <Minus class="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{{ t('tools.addElement') }} ({{ t('toolShortcuts.addElement') }})</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon" class="w-9 h-9">
                <Triangle class="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{{ t('tools.addSupport') }} ({{ t('toolShortcuts.addSupport') }})</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon" class="w-9 h-9">
                <ArrowDown class="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{{ t('tools.addLoad') }} ({{ t('toolShortcuts.addLoad') }})</p>
            </TooltipContent>
          </Tooltip>
        </aside>

        <!-- Center Canvas -->
        <main class="flex-1 overflow-hidden bg-white relative">
          <div class="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            <!-- GridCanvas will go here -->
            <span>Canvas</span>
          </div>
        </main>

        <!-- Right Sidebar -->
        <aside class="w-72 border-l bg-card shrink-0 overflow-y-auto">
          <div class="p-4">
            <h3 class="font-semibold text-sm mb-2">{{ t('properties.title') }}</h3>
            <p class="text-sm text-muted-foreground">{{ t('properties.selectElement') }}</p>
          </div>
        </aside>
      </div>
    </div>
  </TooltipProvider>
</template>
