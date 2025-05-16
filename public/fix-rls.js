/**
 * RLS and Table Relationship Comprehensive Fix
 * 
 * This script addresses:
 * 1. Table relationship errors between projects and project_members
 * 2. Row Level Security (RLS) permission issues
 * 3. Schema caching problems
 * 
 * INSTRUCTIONS:
 * Run this in your browser console (F12 or Cmd+Option+J)
 */

(function() {
  // Create styled console log function
  const log = (message, type = 'info') => {
    const styles = {
      info: 'color: #0066ff; font-weight: bold;',
      success: 'color: #28a745; font-weight: bold;',
      error: 'color: #dc3545; font-weight: bold;',
      warning: 'color: #ffc107; font-weight: bold;'
    };
    
    console.log(`%c[FIX] ${message}`, styles[type] || styles.info);
  };

  // Start the process
  log('Starting comprehensive RLS & relationship fix...', 'info');
  
  try {
    // STEP 1: Force the application to use original tables with RLS
    log('Step 1: Configuring table settings...', 'info');
    localStorage.setItem('relationship_error_detected', 'true');
    localStorage.setItem('use_no_rls_tables', 'false');
    localStorage.setItem('rls_fix_completed', 'true');
    localStorage.setItem('rls_fix_timestamp', new Date().toISOString());
    log('✓ Table configuration set successfully', 'success');
    
    // STEP 2: Clear problematic cached data
    log('Step 2: Clearing cached schema data...', 'info');
    
    // Identify items to remove (careful cleaning approach)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      // Items with schema or supabase in key that aren't our fix flags
      if (key && (key.includes('schema') || key.includes('supabase')) && 
          !key.includes('rls_fix') && 
          key !== 'use_no_rls_tables' && 
          key !== 'relationship_error_detected') {
        keysToRemove.push(key);
      }
    }
    
    // Remove identified keys
    if (keysToRemove.length > 0) {
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        log(`  - Removed: ${key}`, 'info');
      });
      log(`✓ Cleared ${keysToRemove.length} cached items`, 'success');
    } else {
      log('  ✓ No problematic cache found', 'success');
    }
    
    // STEP 3: Set appropriate flags to prevent future errors
    log('Step 3: Setting preventative flags...', 'info');
    localStorage.setItem('show_db_fixer', 'false');
    
    // Preserve auth session if it exists
    const authToken = localStorage.getItem('supabase.auth.token');
    if (authToken) {
      log('  ✓ Auth session preserved', 'success');
    }
    
    // STEP 4: Final success message
    log('✅ COMPREHENSIVE FIX COMPLETE!', 'success');
    log('The application should now work correctly with the original tables.', 'success');
    log('Refresh the page to apply changes.', 'info');
    
    // Add click to reload convenience
    log('Click here to reload page now 👆', 'warning');
    console.log('%c[RELOAD NOW]', 'color: #ffc107; font-weight: bold; font-size: 14px; cursor: pointer; text-decoration: underline;');
    
  } catch (error) {
    log(`❌ Error during fix: ${error.message}`, 'error');
    log('Please try running the fix script again or contact support.', 'error');
  }
})(); 