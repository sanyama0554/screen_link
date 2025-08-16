export default function HomePage() {
  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{ color: '#2563eb', marginBottom: '1rem' }}>
        Screen Link
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#6b7280', marginBottom: '2rem' }}>
        Dependency visualization tool for monorepo
      </p>
      
      <div style={{ 
        background: '#f8fafc', 
        padding: '1.5rem', 
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h2 style={{ color: '#1f2937', marginBottom: '1rem' }}>
          Get Started
        </h2>
        <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.6' }}>
          <li>Configure your project in <code>screen-link.config.json</code></li>
          <li>Run analysis: <code>node packages/cli/dist/cli.js analyze</code></li>
          <li>View dependencies: <code>node packages/cli/dist/cli.js view</code></li>
          <li>Check API impact: <code>node packages/cli/dist/cli.js impact "gql:mutation.example"</code></li>
        </ol>
      </div>

      <div style={{ 
        background: '#fefce8', 
        border: '1px solid #fbbf24',
        padding: '1rem', 
        borderRadius: '8px'
      }}>
        <h3 style={{ color: '#92400e', marginBottom: '0.5rem' }}>
          Note
        </h3>
        <p style={{ color: '#92400e', margin: 0 }}>
          This is a development preview. The interactive visualization UI is coming soon.
        </p>
      </div>
    </div>
  )
}