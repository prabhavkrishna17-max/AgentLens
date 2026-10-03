import { useEffect, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useQuery } from '@tanstack/react-query';
import dagre from 'dagre';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useTraceStore } from '../../stores/traceStore';
import NodeInspector from './NodeInspector';
import PlaybackControls from './PlaybackControls';
import { apiFetch } from '@/lib/api';

const nodeTypes = {
  custom: ({ data, isConnectable }: any) => {
    const isFailed = data.status === 'failed';
    const isSuccess = data.status === 'success' || data.status === 'completed';
    const isExecuting = data.status === 'executing';
    const isSelected = data.isSelected;

    let borderClass = 'border-border/80 bg-background text-foreground hover:border-primary/60';
    if (isFailed) {
      borderClass = 'border-rose-500 bg-rose-950/20 text-foreground ring-1 ring-rose-500/40';
    } else if (isSuccess) {
      borderClass = 'border-emerald-500/50 bg-emerald-950/10 text-foreground';
    } else if (isExecuting) {
      borderClass = 'border-primary bg-primary/10 text-primary animate-pulse ring-1 ring-primary/40';
    }

    if (isSelected) {
      borderClass += ' ring-2 ring-primary ring-offset-1 ring-offset-background';
    }

    return (
      <div 
        className={`px-3 py-2.5 rounded-lg border shadow-sm transition-all cursor-pointer font-sans min-w-[170px] max-w-[210px] ${borderClass}`}
      >
        <Handle 
          type="target" 
          position={Position.Top} 
          isConnectable={isConnectable} 
          className="w-2 h-2 bg-muted-foreground/50 border border-background" 
        />

        <div className="flex flex-col gap-0.5">
          {/* Step Name */}
          <div className="text-xs font-semibold truncate text-foreground leading-snug">
            {data.name}
          </div>

          {/* Step Type */}
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            {data.type || 'STEP'}
          </div>

          {/* Status & Duration Row */}
          <div className="flex items-center justify-between text-[11px] font-mono pt-1 mt-1 border-t border-border/40">
            <div>
              {isSuccess && (
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Success
                </span>
              )}
              {isFailed && (
                <span className="text-rose-400 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3 h-3" /> Failed
                </span>
              )}
              {isExecuting && (
                <span className="text-primary flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Running
                </span>
              )}
              {!isSuccess && !isFailed && !isExecuting && (
                <span className="text-muted-foreground/70">Pending</span>
              )}
            </div>

            {data.duration !== undefined && data.duration !== null && (
              <span className="text-muted-foreground text-[10px]">
                {data.duration.toFixed(2)}s
              </span>
            )}
          </div>
        </div>

        <Handle 
          type="source" 
          position={Position.Bottom} 
          isConnectable={isConnectable} 
          className="w-2 h-2 bg-muted-foreground/50 border border-background" 
        />
      </div>
    );
  },
};

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 190;
  const nodeHeight = 74;

  dagreGraph.setGraph({ rankdir: direction, nodesep: 40, ranksep: 70 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = Position.Top;
    node.sourcePosition = Position.Bottom;
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
  });

  return { nodes, edges };
};

export default function TraceViewer({ runId, runStatus }: { runId: string; runStatus?: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { selectedNodeId, setSelectedNodeId, currentTime, setMaxTime, setCurrentTime } = useTraceStore();

  const isRunActive = (runStatus || '').toLowerCase() === 'running';

  const { data: steps, isLoading } = useQuery({
    queryKey: ['steps', runId],
    queryFn: async () => {
      const res = await apiFetch(`/api/steps/run/${runId}`);
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
    refetchInterval: isRunActive ? 1000 : false
  });

  // Calculate layout and base timings
  useEffect(() => {
    if (steps && steps.length > 0) {
      const firstStart = new Date(steps[0].started_at).getTime();
      let maxEnd = firstStart;

      const baseNodes = steps.map((step: any) => {
        const start = step.started_at ? new Date(step.started_at).getTime() - firstStart : 0;
        const end = step.completed_at ? new Date(step.completed_at).getTime() - firstStart : start;
        if (end > maxEnd - firstStart) maxEnd = end + firstStart;

        return {
          id: step.id,
          type: 'custom',
          position: { x: 0, y: 0 },
          data: { 
            name: step.name, 
            type: step.type, 
            status: step.status, 
            duration: step.duration,
            startMs: start,
            endMs: end,
            finalStatus: step.status
          },
        };
      });

      const baseEdges = steps
        .filter((step: any) => step.parent_id)
        .map((step: any) => ({
          id: `e${step.parent_id}-${step.id}`,
          source: step.parent_id,
          target: step.id,
          animated: false,
          style: { stroke: '#4b5563', strokeWidth: 1.5 },
        }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(baseNodes, baseEdges);

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setMaxTime(maxEnd - firstStart);
      setCurrentTime(maxEnd - firstStart); // default to end of run

      // Auto-select failed step if available so user immediately sees why it failed
      if (!selectedNodeId) {
        const failedStep = steps.find((s: any) => s.status === 'failed');
        if (failedStep) {
          setSelectedNodeId(failedStep.id);
        }
      }
    }
  }, [steps, setNodes, setEdges, setMaxTime, setCurrentTime, selectedNodeId, setSelectedNodeId]);

  // Update visual state based on playback time
  useEffect(() => {
    if (!steps || nodes.length === 0) return;

    setNodes((nds) =>
      nds.map((n) => {
        const { startMs, endMs, finalStatus } = n.data;
        let currentStatus = 'pending';
        let opacity = 1;

        if (currentTime < startMs) {
          currentStatus = 'pending';
          opacity = 0.35;
        } else if (currentTime >= startMs && currentTime < endMs) {
          currentStatus = 'executing';
        } else if (currentTime >= endMs) {
          currentStatus = finalStatus;
        }

        return {
          ...n,
          style: { ...n.style, opacity },
          data: { ...n.data, status: currentStatus, isSelected: selectedNodeId === n.id },
        };
      })
    );

    setEdges((eds) =>
      eds.map((e) => {
        const targetNode = nodes.find((n) => n.id === e.target);
        if (!targetNode) return e;
        
        const { startMs, endMs } = targetNode.data;
        const isExecuting = currentTime >= startMs && currentTime < endMs;
        const isCompleted = currentTime >= endMs;
        const targetFailed = targetNode.data.finalStatus === 'failed';

        return {
          ...e,
          animated: isExecuting,
          style: { 
            stroke: (isCompleted && targetFailed) ? '#f43f5e' : (isExecuting ? '#3b82f6' : '#4b5563'),
            strokeWidth: (isCompleted && targetFailed) ? 2 : 1.5,
            opacity: currentTime < startMs ? 0.3 : 1
          },
        };
      })
    );
  }, [currentTime, steps, selectedNodeId]);

  const onNodeClick = useCallback((_event: any, node: any) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <div className="text-primary animate-pulse font-mono text-xs">
          Loading execution trace...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background relative overflow-hidden flex flex-col md:flex-row">
      <div className="flex-1 relative h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
        >
          <Background color="#262626" gap={18} size={1} />
          <Controls className="fill-foreground bg-accent/80 border-border" />
          <MiniMap 
            nodeColor={(n: any) => {
              if (n.data?.status === 'failed') return '#f43f5e';
              if (n.data?.status === 'success' || n.data?.status === 'completed') return '#10b981';
              if (n.data?.status === 'executing') return '#3b82f6';
              return '#404040';
            }} 
            maskColor="#00000060" 
            className="bg-background/90 border border-border/80 rounded" 
          />
        </ReactFlow>

        {steps && steps.length > 0 && <PlaybackControls />}
      </div>

      <NodeInspector steps={steps || []} />
    </div>
  );
}
