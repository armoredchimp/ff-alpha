<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/client/supabase/supaClient';

  let selectedTable = $state('getAttackingScore');
  let tableData = $state([]);
  let columns = $state([]);
  let loading = $state(false);
  let saving = $state(false);
  let message = $state('');
  let hasChanges = $state(false);

  const tables = [
    'getAttackingScore',
    'getFinishingScore', 
    'getDefensiveScore',
    'getPassingScore',
    'getPossessionScore',
    'getKeeperScore'
  ];

  // Track original data to detect changes
  let originalData = [];

  onMount(() => {
    loadTable();
  });

  async function loadTable() {
    loading = true;
    message = '';
    hasChanges = false;
    
    try {
      const { data, error } = await supabase
        .from(selectedTable)
        .select('*')
        .order('Position');

      if (error) throw error;

      if (data && data.length > 0) {
        // Get columns (excluding Position which is the key)
        columns = Object.keys(data[0]).filter(col => col !== 'Position');
        tableData = data;
        // Store original data for change detection
        originalData = JSON.parse(JSON.stringify(data));
      } else {
        tableData = [];
        columns = [];
      }
    } catch (error) {
      console.error('Error loading table:', error);
      message = `Error loading table: ${error.message}`;
    } finally {
      loading = false;
    }
  }

  function handleInputChange(rowIndex, column, value) {
    // Only allow numbers, negative sign, decimal point, or empty
    const numValue = value === '' ? null : 
                     column === 'SuccessfulCrossesPercentage' ? 
                     (value === '-' || value === '.' || value === '-.' ? value : parseFloat(value)) :
                     (value === '-' ? value : parseInt(value));
    
    // Update the data
    tableData[rowIndex][column] = numValue;
    
    // Check if there are changes
    checkForChanges();
  }

  function fillColumn(column, value) {
    // Apply the value to all rows in this column
    tableData = tableData.map(row => ({
      ...row,
      [column]: value
    }));
    
    checkForChanges();
    message = `Filled column "${column.replace(/Per90/g, '').replace(/Percentage/g, '%')}" with value: ${value ?? 'null'}`;
    setTimeout(() => {
      message = '';
    }, 2000);
  }

  function checkForChanges() {
    hasChanges = JSON.stringify(tableData) !== JSON.stringify(originalData);
  }

  async function saveChanges() {
    if (!hasChanges) {
      message = 'No changes to save';
      return;
    }

    saving = true;
    message = '';
    
    try {
      // Update each row
      for (const row of tableData) {
        const { Position, ...updateData } = row;
        
        // Convert any string "-" values to null
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === '-' || updateData[key] === '') {
            updateData[key] = null;
          }
        });
        
        const { error } = await supabase
          .from(selectedTable)
          .update(updateData)
          .eq('Position', Position);

        if (error) throw error;
      }

      message = '✓ Changes saved successfully!';
      originalData = JSON.parse(JSON.stringify(tableData));
      hasChanges = false;
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        message = '';
      }, 3000);
      
    } catch (error) {
      console.error('Error saving changes:', error);
      message = `Error saving changes: ${error.message}`;
    } finally {
      saving = false;
    }
  }

  function resetChanges() {
    tableData = JSON.parse(JSON.stringify(originalData));
    hasChanges = false;
    message = 'Changes reset';
    setTimeout(() => {
      message = '';
    }, 2000);
  }


</script>

<div class="admin-container">
  <div class="header">
    <h2>Weight Tables Admin</h2>
    
    <div class="controls">
      <select bind:value={selectedTable} disabled={saving} onchange={loadTable}>
        {#each tables as table}
          <option value={table}>{table.replace('get', '').replace('Score', ' Score')}</option>
        {/each}
      </select>
      
      <button 
        onclick={loadTable} 
        disabled={loading || saving}
        class="btn-secondary"
      >
        {loading ? 'Loading...' : 'Refresh'}
      </button>
    </div>
  </div>

  <div class="message-container">
    {#if message}
      <div class="message {message.includes('Error') ? 'error' : message.includes('✓') ? 'success' : 'info'}">
        {message}
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="loading">Loading table data...</div>
  {:else if tableData.length > 0}
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th class="position-header">Position</th>
            {#each columns as column}
              <th class="value-header" title={column}>
                {column.replace(/Per90/g, '').replace(/Percentage/g, '%')}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each tableData as row, rowIndex}
            <tr>
              <td class="position-cell">{row.Position}</td>
              {#each columns as column}
                <td class="value-cell">
                  <div class="cell-wrapper">
                    <input
                      type="text"
                      value={row[column] ?? ''}
                      oninput={(e) => handleInputChange(rowIndex, column, e.target.value)}
                      disabled={saving}
                      class="value-input"
                      placeholder="null"
                      pattern="[0-9.\-]*"
                      inputmode="numeric"
                    />
                    <button
                      class="fill-btn"
                      onclick={() => fillColumn(column, row[column])}
                      disabled={saving}
                      title="Fill entire column with this value"
                    >
                      ↓
                    </button>
                  </div>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="actions">
      <div class="status">
        {#if hasChanges}
          <span class="changes-indicator">• Unsaved changes</span>
        {/if}
      </div>
      
      <div class="buttons">
        <button 
          onclick={resetChanges} 
          disabled={!hasChanges || saving}
          class="btn-secondary"
        >
          Reset Changes
        </button>
        
        <button 
          onclick={saveChanges} 
          disabled={!hasChanges || saving}
          class="btn-primary"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  {:else}
    <div class="no-data">No data found for {selectedTable}</div>
  {/if}
</div>

<style>
  .admin-container {
    max-width: 100%;
    padding: 20px;
    background: #f9f9f9;
    border-radius: 8px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 15px;
  }

  h2 {
    margin: 0;
    color: #333;
    font-size: 24px;
  }

  .controls {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    background: white;
    cursor: pointer;
    min-width: 180px;
  }

  select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .message-container {
    height: 60px;
    margin-bottom: 15px;
    display: flex;
    align-items: center;
  }

  .message {
    width: 100%;
    padding: 12px;
    border-radius: 4px;
    font-size: 14px;
    border: 1px solid transparent;
  }

  .message.success {
    background: #d4edda;
    color: #155724;
    border-color: #c3e6cb;
  }

  .message.error {
    background: #f8d7da;
    color: #721c24;
    border-color: #f5c6cb;
  }

  .message.info {
    background: #d1ecf1;
    color: #0c5460;
    border-color: #bee5eb;
  }

  .loading, .no-data {
    text-align: center;
    padding: 40px;
    color: #666;
    font-size: 16px;
  }

  .table-wrapper {
    overflow-x: auto;
    background: white;
    border-radius: 6px;
    border: 1px solid #ddd;
    margin-bottom: 20px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  thead {
    background: #f0f0f0;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  th {
    padding: 10px 6px;
    text-align: left;
    font-weight: 600;
    color: #555;
    border-bottom: 2px solid #ddd;
    white-space: nowrap;
  }

  .position-header {
    min-width: 140px;
    padding-left: 12px;
    background: #e8e8e8;
  }

  .value-header {
    text-align: center;
    font-size: 11px;
    min-width: 80px;
  }

  tbody tr {
    border-bottom: 1px solid #eee;
  }

  tbody tr:hover {
    background: #fafafa;
  }

  .position-cell {
    font-weight: 500;
    color: #333;
    padding: 8px 12px;
    background: #f9f9f9;
    position: sticky;
    left: 0;
    z-index: 5;
  }

  .value-cell {
    padding: 4px;
    text-align: center;
    position: relative;
  }

  .cell-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .fill-btn {
    position: absolute;
    right: -20px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    padding: 0;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 3px;
    font-size: 11px;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 2;
  }

  .cell-wrapper:hover .fill-btn,
  .fill-btn:focus {
    opacity: 1;
  }

  .fill-btn:hover:not(:disabled) {
    background: #1976D2;
    transform: translateY(-50%) scale(1.1);
  }

  .fill-btn:disabled {
    cursor: not-allowed;
    opacity: 0.3;
  }

  .value-input {
    width: 100%;
    min-width: 60px;
    max-width: 80px;
    padding: 6px 4px;
    border: 1px solid #ddd;
    border-radius: 3px;
    text-align: center;
    font-size: 13px;
    background: white;
    transition: all 0.2s;
  }

  .value-input:focus {
    outline: none;
    border-color: #4CAF50;
    background: #f0f9ff;
  }

  .value-input:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  .value-input::placeholder {
    color: #ccc;
    font-style: italic;
  }

  .actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 15px;
    border-top: 1px solid #e0e0e0;
  }

  .status {
    min-height: 24px;
  }

  .changes-indicator {
    color: #ff9800;
    font-size: 14px;
    font-weight: 500;
  }

  .buttons {
    display: flex;
    gap: 10px;
  }

  button {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #4CAF50;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #45a049;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #5a6268;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .header {
      flex-direction: column;
      align-items: flex-start;
    }

    .controls {
      width: 100%;
    }

    select {
      flex: 1;
    }

    .actions {
      flex-direction: column;
      gap: 15px;
    }

    .buttons {
      width: 100%;
    }

    button {
      flex: 1;
    }

    .value-input {
      min-width: 50px;
      max-width: 60px;
      padding: 4px 2px;
      font-size: 12px;
    }

    th, td {
      padding: 6px 4px;
    }

    .position-cell {
      font-size: 12px;
    }
  }
</style>
