<script>
  import { requestApi } from '../../utils/api'

  let tablesInfo = {}
  let infoError = null
  let fileInput
  const fileAction = {
    method: 'PATCH',
    url: ''
  }

  const confirmAction = (action, name) => confirm(`Are you sure to ${action} ${name}`)

  const updateInfo = async () => {
    const data = await requestApi('GET', '/db-tables')
    if (data.status !== 200) {
      infoError = JSON.stringify(data)
      return
    }
    infoError = null
    tablesInfo = data.tables
  }

  const createAll = async () => {
    await requestApi('POST', '/db-tables/create-all')
    await updateInfo()
  }

  const migrate = async () => {
    const todo = await requestApi('GET', '/db-tables/migrate')
    if (!confirm(todo.migration)) return
    await requestApi('POST', '/db-tables/migrate')
    await updateInfo()
  }

  const downloadData = async (tableName) => {
    const data = await requestApi('GET', `/db-tables/${tableName}`)
    if (data.status !== 200) return
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(data.data))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute('href', dataStr)
    downloadAnchorNode.setAttribute(
      'download',
      `${tableName}-${+new Date()}.json`
    )
    document.body.appendChild(downloadAnchorNode) // required for firefox
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const uploadFile = async (e) => {
    const file = e.target.files[0]
    // Clear input to let it fire for the same file
    e.target.value = null
    const reader = new FileReader()
    reader.onload = async (e) => {
      const content = e.target.result
      await requestApi(fileAction.method, fileAction.url, {
        data: JSON.parse(content)
      })
      await updateInfo()
    }
    reader.readAsText(file)
  }

  updateInfo()
</script>

<div>
  <button on:click={createAll}>Create All</button>
  <button on:click={migrate}>Migrate</button>
  {#if Object.keys(tablesInfo).length === 0}
    <div>
      {#if infoError}
        {infoError}
      {:else}
        No table to show...
      {/if}
    </div>
  {:else}
    <div class="db-tables">
      {#each Object.keys(tablesInfo) as tableName}
        <div class="db-table">
          <div class="db-table-info">
            <div>{tableName}</div>
            <div>
              {tablesInfo[tableName].exists ? 'Exists' : 'Not Exist'}
              {tablesInfo[tableName].rows} rows
            </div>
          </div>
          <div class="spacer" />
          <button on:click={() => downloadData(tableName)}>Download</button>
          <button
            on:click={async () => {
              if (!confirmAction('patch', tableName)) return
              fileAction.method = 'PATCH'
              fileAction.url = `/db-tables/${tableName}`
              fileInput.click()
            }}
          >
            Upload
          </button>
          <button
            on:click={async () => {
              if (!confirmAction('overwrite', tableName)) return
              fileAction.method = 'PUT'
              fileAction.url = `/db-tables/${tableName}`
              fileInput.click()
            }}
          >
            Overwrite
          </button>
          <button
            on:click={async () => {
              if (!confirmAction('delete', tableName)) return
              await requestApi('DELETE', `/db-tables/${tableName}`)
              await updateInfo()
            }}
          >
            Delete
          </button>
        </div>
      {/each}
    </div>
  {/if}
  <input
    bind:this={fileInput}
    ref="file"
    type="file"
    accept=".json"
    hidden
    on:change={uploadFile}
  />
</div>

<style>
  .db-tables {
    margin-top: 10px;
  }
  .db-table-info {
    display: inline-block;
  }
  .db-table {
    display: flex;
    padding: 5px;
  }
  .spacer {
    display: flex;
    flex-grow: 1;
  }
  .db-table:nth-child(2n + 1) {
    background-color: lightgreen;
  }
  .db-table:nth-child(2n) {
    background-color: lightcyan;
  }
</style>
