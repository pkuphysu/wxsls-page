<script>
  import { onMount } from 'svelte'
  import { requestApi } from '../../utils/api'

  const REFRESH_INTERVAL = 10000
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

  let tablesInfo = {}
  let selectedTable = ''
  let tableData = []
  let columns = []
  let primaryKey = []
  let totalRows = 0
  let totalPages = 1
  let tableFilter = ''
  let rowFilter = ''
  let sortColumn = ''
  let sortDirection = 'asc'
  let page = 1
  let pageSize = 20
  let loadingTables = true
  let loadingData = false
  let actionBusy = false
  let infoError = ''
  let lastUpdated = null
  let autoRefresh = true
  let editingIndex = -1
  let draftRow = {}
  let showAddRow = false
  let newRow = {}
  let showMigration = false
  let migrationPreview = ''
  let importMethod = 'PATCH'
  let fileInput
  let toast = null
  let toastTimer
  let searchTimer
  let requestSequence = 0

  $: tableNames = Object.keys(tablesInfo)
  $: visibleTables = tableNames.filter(name =>
    name.toLowerCase().includes(tableFilter.trim().toLowerCase())
  )
  $: selectedInfo = tablesInfo[selectedTable] || null
  $: columnNames = columns.map(column => column.name)
  $: canCreateRows = columns.length > 0 && !actionBusy && !loadingData
  $: canIdentifyRows = primaryKey.length > 0
  $: paginatedRows = tableData.map((row, index) => ({ row, index }))

  const notify = (message, type = 'success') => {
    clearTimeout(toastTimer)
    toast = { message, type }
    toastTimer = setTimeout(() => { toast = null }, 3500)
  }

  const callApi = async (method, url, body) => {
    const data = await requestApi(method, url, body)
    if (!data || data.status !== 200) {
      const reason = data?.error || data?.message || '请求失败，请检查网络或登录状态'
      throw new Error(reason)
    }
    return data
  }

  const tableEndpoint = tableName => `/db-tables/${encodeURIComponent(tableName)}`
  const rowEndpoint = tableName => `${tableEndpoint(tableName)}/rows`

  const toggleSort = async column => {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
    } else {
      sortColumn = column
      sortDirection = 'asc'
    }
    page = 1
    await loadTable(selectedTable)
  }

  const formatCell = value => {
    if (value === null) return 'NULL'
    if (value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const inputValue = value => {
    if (value === null) return 'null'
    if (typeof value === 'object') return JSON.stringify(value)
    return value ?? ''
  }

  const parseValue = (rawValue, column) => {
    const value = String(rawValue)
    if (value.trim().toLowerCase() === 'null') return null
    if (column.kind === 'binary') {
      try {
        const parsed = JSON.parse(value)
        if (typeof parsed?.$binary !== 'string') throw new Error()
        return parsed
      } catch {
        throw new Error(`${column.name} 必须是 {"$binary":"base64..."}`)
      }
    }
    if (/INT|FLOAT|DOUBLE|DECIMAL|NUMERIC|REAL/i.test(column.type)) {
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) throw new Error(`“${value}”不是有效数字`)
      return parsed
    }
    if (/BOOL/i.test(column.type)) {
      if (value === 'true') return true
      if (value === 'false') return false
      throw new Error('布尔值只能是 true 或 false')
    }
    if (/JSON/i.test(column.type)) {
      return JSON.parse(value)
    }
    return value
  }

  const normalizeRow = (source, { partial = false } = {}) => Object.fromEntries(
    columns.flatMap(column => {
      const rawValue = source[column.name]
      if (partial && rawValue === undefined) return []
      if (!partial && rawValue === '' && column.has_default) return []
      return [[column.name, parseValue(rawValue ?? '', column)]]
    })
  )

  const updateInfo = async ({ silent = false, refreshData = false, lightweight = false } = {}) => {
    if (!silent) loadingTables = true
    try {
      const data = await callApi('GET', lightweight ? '/db-tables?include_counts=0' : '/db-tables')
      const incomingTables = data.tables || {}
      tablesInfo = lightweight
        ? Object.fromEntries(Object.entries(incomingTables).map(([name, info]) => [
          name,
          { ...info, rows: tablesInfo[name]?.rows ?? info.rows }
        ]))
        : incomingTables
      infoError = ''
      if (!selectedTable || !tablesInfo[selectedTable]) {
        selectedTable = Object.keys(tablesInfo).find(name => tablesInfo[name].exists) ||
          Object.keys(tablesInfo)[0] || ''
        refreshData = Boolean(selectedTable)
      }
      if (refreshData && selectedTable) await loadTable(selectedTable, { silent })
      lastUpdated = new Date()
    } catch (error) {
      infoError = error.message
      if (!silent) notify(error.message, 'error')
    } finally {
      loadingTables = false
    }
  }

  const loadTable = async (tableName, { silent = false } = {}) => {
    if (!tableName || !tablesInfo[tableName]?.exists) {
      tableData = []
      columns = []
      primaryKey = []
      totalRows = 0
      totalPages = 1
      return
    }
    const sequence = ++requestSequence
    if (!silent) loadingData = true
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        order: sortDirection
      })
      if (rowFilter.trim()) params.set('search', rowFilter.trim())
      if (sortColumn) params.set('sort', sortColumn)
      const data = await callApi('GET', `${tableEndpoint(tableName)}?${params}`)
      if (tableName !== selectedTable || sequence !== requestSequence) return
      tableData = data.data || []
      totalRows = data.count ?? tableData.length
      tablesInfo = {
        ...tablesInfo,
        [tableName]: { ...tablesInfo[tableName], rows: totalRows }
      }
      totalPages = data.pages || 1
      page = data.page || page
      columns = data.columns || []
      primaryKey = data.primary_key || []
      editingIndex = -1
      lastUpdated = new Date()
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      if (sequence === requestSequence) loadingData = false
    }
  }

  const selectTable = async tableName => {
    selectedTable = tableName
    rowFilter = ''
    sortColumn = ''
    page = 1
    editingIndex = -1
    await loadTable(tableName)
  }

  const refresh = async () => {
    await updateInfo({ refreshData: true })
  }

  const runAction = async (action, successMessage) => {
    actionBusy = true
    try {
      await action()
      await updateInfo({ silent: true })
      await loadTable(selectedTable, { silent: true })
      notify(successMessage)
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      actionBusy = false
    }
  }

  const createAll = () => runAction(
    () => callApi('POST', '/db-tables/create-all'),
    '缺失的数据表已创建'
  )

  const previewMigration = async () => {
    actionBusy = true
    try {
      const data = await callApi('GET', '/db-tables/migrate')
      migrationPreview = data.migration || '[]'
      showMigration = true
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      actionBusy = false
    }
  }

  const applyMigration = async () => {
    showMigration = false
    await runAction(
      () => callApi('POST', '/db-tables/migrate'),
      '数据库迁移已完成'
    )
  }

  const beginEdit = index => {
    editingIndex = index
    draftRow = Object.fromEntries(columnNames.map(column => [column, inputValue(tableData[index][column])]))
  }

  const saveEdit = async index => {
    let changes
    try {
      changes = normalizeRow(draftRow, { partial: true })
      for (const key of primaryKey) delete changes[key]
    } catch (error) {
      notify(error.message, 'error')
      return
    }
    const key = Object.fromEntries(primaryKey.map(column => [column, tableData[index][column]]))
    await runAction(
      () => callApi('PATCH', rowEndpoint(selectedTable), { key, data: changes }),
      '记录已更新'
    )
  }

  const openAddRow = () => {
    newRow = Object.fromEntries(columnNames.map(column => [column, '']))
    showAddRow = true
  }

  const addRow = async () => {
    let record
    try {
      record = normalizeRow(newRow)
    } catch (error) {
      notify(error.message, 'error')
      return
    }
    showAddRow = false
    await runAction(
      () => callApi('POST', rowEndpoint(selectedTable), { data: record }),
      '新记录已添加'
    )
  }

  const deleteRow = async index => {
    if (!confirm('确定删除这条记录吗？该操作会立即写入数据库。')) return
    const key = Object.fromEntries(primaryKey.map(column => [column, tableData[index][column]]))
    if (tableData.length === 1 && page > 1) page -= 1
    await runAction(
      () => callApi('DELETE', rowEndpoint(selectedTable), { key }),
      '记录已删除'
    )
  }

  const clearTable = async () => {
    if (!confirm(`确定清空 ${selectedTable} 的全部 ${totalRows} 条记录吗？此操作不可撤销。`)) return
    await runAction(
      () => callApi('DELETE', tableEndpoint(selectedTable)),
      `${selectedTable} 已清空`
    )
  }

  const downloadData = () => {
    const blob = new Blob([JSON.stringify(tableData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${selectedTable}-${new Date().toISOString().replaceAll(':', '-')}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    notify(`已导出当前页的 ${tableData.length} 条记录`)
  }

  const searchRows = () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(async () => {
      page = 1
      await loadTable(selectedTable)
    }, 350)
  }

  const changePage = async nextPage => {
    page = nextPage
    await loadTable(selectedTable)
  }

  const changePageSize = async () => {
    pageSize = Number(pageSize)
    page = 1
    await loadTable(selectedTable)
  }

  const chooseImport = method => {
    if (method === 'PUT' && !confirm(`导入将覆盖 ${selectedTable} 的全部数据，确定继续吗？`)) return
    importMethod = method
    fileInput.click()
  }

  const uploadFile = event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = async loadEvent => {
      try {
        const records = JSON.parse(loadEvent.target.result)
        if (!Array.isArray(records) || !records.length) {
          throw new Error('JSON 文件必须包含非空记录数组')
        }
        await runAction(
          () => callApi(importMethod, tableEndpoint(selectedTable), { data: records }),
          importMethod === 'PUT' ? '数据已覆盖导入' : '数据已追加导入'
        )
      } catch (error) {
        notify(error.message, 'error')
      }
    }
    reader.readAsText(file)
  }

  onMount(() => {
    updateInfo({ refreshData: true })
    const interval = setInterval(() => {
      if (autoRefresh && !actionBusy && editingIndex === -1 && !showAddRow) {
        updateInfo({ silent: true, refreshData: true, lightweight: true })
      }
    }, REFRESH_INTERVAL)
    return () => {
      clearInterval(interval)
      clearTimeout(toastTimer)
      clearTimeout(searchTimer)
    }
  })
</script>

<svelte:head>
  <meta name="description" content="PKUPHYSU 数据库后台" />
</svelte:head>

<div class="h-screen bg-slate-50 text-slate-900">
  <header class="border-b border-slate-200 bg-white">
    <div class="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-5 py-4 lg:px-8">
      <div class="flex min-w-0 items-center gap-3">
        <div class="min-w-0">
          <h1 class="truncate text-base font-semibold tracking-tight">数据库管理</h1>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <label class="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">
          <input bind:checked={autoRefresh} type="checkbox" class="size-3.5 accent-sky-600" />
          10 秒自动刷新
        </label>
        <button class="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50" disabled={loadingTables || actionBusy} on:click={refresh}>
          <span class:animate-spin={loadingTables}>↻</span>
          刷新
        </button>
        <button class="hidden h-9 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 sm:block" disabled={actionBusy} on:click={previewMigration}>数据库迁移</button>
      </div>
    </div>
  </header>

  <main class="mx-auto grid max-w-[1600px] gap-5 p-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:p-8">
    <aside class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold">数据表</h2>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{tableNames.length}</span>
        </div>
        <input bind:value={tableFilter} type="search" placeholder="Search…" class="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100" />
      </div>

      <nav class="max-h-[calc(100vh-270px)] min-h-48 overflow-y-auto p-2" aria-label="数据库表">
        {#if loadingTables && tableNames.length === 0}
          {#each Array(6) as _}
            <div class="mb-1 h-14 animate-pulse rounded-lg bg-slate-100"></div>
          {/each}
        {:else if infoError}
          <div class="m-2 rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-700">{infoError}</div>
        {:else if visibleTables.length === 0}
          <p class="p-4 text-center text-sm text-slate-400">没有匹配的数据表</p>
        {:else}
          {#each visibleTables as tableName}
            <button class="mb-1 flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-50" class:bg-sky-50={selectedTable === tableName} class:text-sky-800={selectedTable === tableName} on:click={() => selectTable(tableName)}>
              <span class="min-w-0">
                <span class="block truncate text-sm font-medium">{tableName}</span>
                <span class="mt-0.5 block text-xs text-slate-400">{tablesInfo[tableName].exists ? `${tablesInfo[tableName].rows} 条记录` : '尚未创建'}</span>
              </span>
              <span class="size-2 shrink-0 rounded-full" class:bg-emerald-500={tablesInfo[tableName].exists} class:bg-amber-400={!tablesInfo[tableName].exists}></span>
            </button>
          {/each}
        {/if}
      </nav>

      <div class="border-t border-slate-100 p-3">
        <button class="h-9 w-full rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50" disabled={actionBusy} on:click={createAll}>创建缺失表</button>
      </div>
    </aside>

    <section class="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {#if !selectedTable}
        <div class="grid min-h-[560px] place-items-center p-8 text-center">
          <div>
            <div class="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-slate-100 text-2xl">⌗</div>
            <h2 class="font-semibold">暂无可管理的数据表</h2>
            <p class="mt-1 text-sm text-slate-500">创建数据库表后即可开始管理记录。</p>
          </div>
        </div>
      {:else}
        <div class="border-b border-slate-200 p-4 sm:p-5">
          <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-mono text-lg font-semibold tracking-tight">{selectedTable}</h2>
                {#if selectedInfo?.exists}
                  <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">运行中</span>
                {:else}
                  <span class="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">未创建</span>
                {/if}
              </div>
              <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>{totalRows} 条记录</span>
                <span>{columnNames.length} 个字段</span>
                <span>{lastUpdated ? `更新于 ${lastUpdated.toLocaleTimeString()}` : '正在连接…'}</span>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button class="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50" disabled={!selectedInfo?.exists || loadingData} on:click={downloadData}>导出当前页</button>
              <button class="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50" disabled={!selectedInfo?.exists || actionBusy} on:click={() => chooseImport('PATCH')}>追加导入</button>
              <button class="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50" disabled={!selectedInfo?.exists || actionBusy} on:click={() => chooseImport('PUT')}>覆盖导入</button>
              <button class="h-9 rounded-lg bg-sky-600 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50" disabled={!canCreateRows} on:click={openAddRow}>＋ 新增记录</button>
            </div>
          </div>
        </div>

        {#if selectedInfo?.exists}
          <div class="flex flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
            <div class="relative w-full max-w-sm">
              <input bind:value={rowFilter} on:input={searchRows} type="search" placeholder="搜索全表文本字段…" class="h-9 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              <span class="pointer-events-none absolute right-3 top-2 text-slate-400">⌕</span>
            </div>
            <div class="hidden flex items-center gap-3 text-xs text-slate-500">
              {#if canIdentifyRows}
                <span class="inline-flex items-center gap-1.5"><span class="size-1.5 rounded-full bg-emerald-500"></span>服务端分页 · 支持行级写入</span>
              {:else}
                <span class="rounded-md bg-amber-50 px-2 py-1 text-amber-700">该表没有主键，仅支持读取和新增</span>
              {/if}
            </div>
          </div>

          <div class="relative min-h-[420px] overflow-auto">
            {#if loadingData}
              <div class="absolute inset-0 z-10 grid place-items-center bg-white/70 backdrop-blur-[1px]"><div class="size-7 animate-spin rounded-full border-2 border-slate-200 border-t-sky-600"></div></div>
            {/if}
            {#if columns.length === 0}
              <div class="grid min-h-[420px] place-items-center p-8 text-center">
                <div>
                  <div class="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-slate-100 text-xl">∅</div>
                  <p class="text-sm font-medium">表中暂无记录</p>
                  <p class="mt-1 text-xs text-slate-500">字段结构已加载，可以新增记录或导入 JSON。</p>
                </div>
              </div>
            {:else}
              <table class="w-full border-collapse text-left text-sm">
                <thead class="sticky top-0 z-[1] bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-[0_1px_0_#e2e8f0]">
                  <tr>
                    <th class="w-14 px-4 py-3 text-center">#</th>
                    {#each columns as column}
                      <th class="min-w-40 px-4 py-3 font-mono normal-case">
                        <button class="inline-flex items-center gap-1.5 rounded text-left hover:text-slate-900" aria-label={`按 ${column.name} 排序`} on:click={() => toggleSort(column.name)}>
                          {column.name}
                          <span class="text-[10px] text-slate-400">{sortColumn === column.name ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </button>
                      </th>
                    {/each}
                    <th class="sticky right-0 min-w-28 bg-slate-50 px-4 py-3 text-right normal-case">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  {#each paginatedRows as item}
                    <tr class="group transition hover:bg-sky-50/40">
                      <td class="px-4 py-3 text-center text-xs tabular-nums text-slate-400">{(page - 1) * pageSize + item.index + 1}</td>
                      {#each columns as column}
                        <td class="max-w-80 px-4 py-2.5 align-top">
                          {#if editingIndex === item.index}
                            <input bind:value={draftRow[column.name]} aria-label={`编辑 ${column.name}`} disabled={column.primary_key} class="h-8 w-full min-w-36 rounded-md border border-sky-300 bg-white px-2 !font-mono text-xs outline-none ring-2 ring-sky-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500" />
                          {:else}
                            <span class="block max-h-20 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5" class:italic={item.row[column.name] === null} class:text-slate-400={item.row[column.name] === null}>{formatCell(item.row[column.name])}</span>
                          {/if}
                        </td>
                      {/each}
                      <td class="sticky right-0 bg-white px-4 py-2.5 text-right group-hover:bg-sky-50/40">
                        {#if editingIndex === item.index}
                          <div class="flex justify-end gap-1">
                            <button class="rounded-md px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100" disabled={actionBusy} on:click={() => saveEdit(item.index)}>保存</button>
                            <button class="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100" on:click={() => { editingIndex = -1 }}>取消</button>
                          </div>
                        {:else}
                          <div class="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                            <button class="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30" disabled={!canIdentifyRows || actionBusy} on:click={() => beginEdit(item.index)}>编辑</button>
                            <button class="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-30" disabled={!canIdentifyRows || actionBusy} on:click={() => deleteRow(item.index)}>删除</button>
                          </div>
                        {/if}
                      </td>
                    </tr>
                  {:else}
                    <tr><td colspan={columnNames.length + 2} class="px-5 py-16 text-center text-sm text-slate-400">没有匹配的记录</td></tr>
                  {/each}
                </tbody>
              </table>
            {/if}
          </div>

          <footer class="flex flex-col justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
            <div class="flex items-center gap-2 text-xs text-slate-500">
              <span>每页</span>
              <select bind:value={pageSize} on:change={changePageSize} class="rounded-md border border-slate-200 bg-white px-2 py-1 outline-none">
                {#each PAGE_SIZE_OPTIONS as size}<option value={size}>{size}</option>{/each}
              </select>
              <span>条 · 共 {totalRows} 条</span>
            </div>
            <div class="flex items-center gap-2">
              <button class="h-8 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-30" disabled={page === 1 || loadingData} on:click={() => changePage(page - 1)}>上一页</button>
              <span class="min-w-16 text-center text-xs tabular-nums text-slate-500">{page} / {totalPages}</span>
              <button class="h-8 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-30" disabled={page === totalPages || loadingData} on:click={() => changePage(page + 1)}>下一页</button>
            </div>
            <button class="text-left text-xs font-medium text-red-600 hover:text-red-700 sm:text-right" disabled={actionBusy} on:click={clearTable}>清空整张表</button>
          </footer>
        {:else}
          <div class="grid min-h-[500px] place-items-center p-8 text-center">
            <div>
              <div class="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-amber-50 text-2xl text-amber-700">!</div>
              <h3 class="font-semibold">数据表尚未创建</h3>
              <p class="mt-1 text-sm text-slate-500">创建缺失表后即可查看和管理数据。</p>
              <button class="mt-4 h-9 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white" disabled={actionBusy} on:click={createAll}>创建数据表</button>
            </div>
          </div>
        {/if}
      {/if}
    </section>
  </main>

  <input bind:this={fileInput} type="file" accept="application/json,.json" hidden on:change={uploadFile} />

  {#if showAddRow}
    <div class="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" on:click={event => { if (event.currentTarget === event.target) showAddRow = false }}>
      <div class="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="add-row-title">
        <div class="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div><h3 id="add-row-title" class="font-semibold">新增记录</h3><p class="mt-0.5 text-xs text-slate-500">可省略带默认值的字段；输入 null 可提交空值。</p></div>
          <button class="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="关闭" on:click={() => { showAddRow = false }}>×</button>
        </div>
        <div class="grid max-h-[60vh] gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          {#each columns as column}
            <label class="block"><span class="mb-1.5 flex items-center gap-2 font-mono text-xs font-medium text-slate-600">{column.name}<span class="font-sans font-normal text-slate-400">{column.type}{column.has_default ? ' · 可省略' : ''}</span></span><input bind:value={newRow[column.name]} class="h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" placeholder={column.has_default ? '留空使用默认值' : '输入字段值'} /></label>
          {/each}
        </div>
        <div class="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4"><button class="h-9 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700" on:click={() => { showAddRow = false }}>取消</button><button class="h-9 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700" on:click={addRow}>添加记录</button></div>
      </div>
    </div>
  {/if}

  {#if showMigration}
    <div class="fixed inset-0 z-40 grid place-items-center bg-slate-950/40 p-5 backdrop-blur-sm">
      <div class="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="migration-title">
        <div class="border-b border-slate-200 px-5 py-4"><h3 id="migration-title" class="font-semibold">数据库迁移预览</h3><p class="mt-1 text-xs text-slate-500">请确认以下结构变更。迁移会直接修改数据库结构。</p></div>
        <pre class="max-h-[55vh] overflow-auto bg-slate-950 p-5 text-xs leading-5 text-slate-200">{migrationPreview}</pre>
        <div class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button class="h-9 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700" on:click={() => { showMigration = false }}>取消</button><button class="h-9 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-40" disabled={migrationPreview === '[]'} on:click={applyMigration}>{migrationPreview === '[]' ? '无需迁移' : '确认执行迁移'}</button></div>
      </div>
    </div>
  {/if}

  {#if toast}
    <div class="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border bg-white px-4 py-3 text-sm font-medium shadow-xl" class:border-red-200={toast.type === 'error'} class:text-red-700={toast.type === 'error'} class:border-amber-200={toast.type === 'warning'} class:text-amber-700={toast.type === 'warning'} class:border-emerald-200={toast.type === 'success'} class:text-emerald-700={toast.type === 'success'} role="status">{toast.message}</div>
  {/if}
</div>
