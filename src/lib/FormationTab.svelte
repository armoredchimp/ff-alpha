<script>
    let { 
      group = '',
      scores = {
        attacking : 0,
        possession : 0,
        passing : 0,
        defense : 0,
        keeping : 0
      },
    } = $props();
  </script>
  
  <!-- Tab container: positioned outside the left border of the formation field -->
  <div class="formation-tab">
    <span class="group-name">{group}</span>
    <p>{scores.attacking}</p>
    <p>{scores.possession}</p>
    <p>{scores.passing}</p>
    <p>{scores.defense}</p>
  </div>
  
  <style>
    /* Base styling for the tab */
    .formation-tab {
      background-color: #f4f4f4;
      padding: 0.5rem 1rem;
     
      border-top-right-radius: 8px;
      border-bottom-right-radius: 8px;

      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      
      z-index: 10;
    }
  
    /* Active state: subtle color change to indicate selection */
    .formation-tab {
      background-color: #e0e0e0;
    }
  
    /* Typography for the group label */
    .group-name {
      font-size: 0.9rem;
      font-weight: 500;
      text-transform: capitalize;
      color: #333;
    }
  </style>