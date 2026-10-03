import { Link } from 'react-router-dom'

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 bg-grid-pattern">
      <div className="max-w-3xl w-full flex flex-col gap-8 items-center text-center">
        <h1 className="text-5xl font-sans font-bold tracking-tight">Agent<span className="text-primary">Lens</span></h1>
        <p className="text-xl text-muted-foreground font-mono">
          See what your AI agent did. Understand why it did it.
        </p>
        
        <div className="p-6 border border-border bg-accent/50 rounded-lg shadow-lg max-w-md w-full text-left">
          <div className="text-sm text-primary mb-2 font-mono uppercase tracking-wider">System Status</div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-mono text-sm text-muted-foreground">Observability Engine Active</span>
          </div>
        </div>
        
        <Link to="/dashboard" className="mt-8 px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition-colors">
          Open Dashboard
        </Link>
      </div>
    </div>
  )
}

export default App
