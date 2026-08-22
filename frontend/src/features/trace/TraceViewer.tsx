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
import { useTraceStore } from '../../stores/traceStore';
import NodeInspector from './NodeInspector';
import PlaybackControls from './PlaybackControls';
import { apiFetch } from '@/lib/api';

const nodeTypes = {
  custom: ({ data, isConnectable }: any) => {
    const getStatusColor = (status: string) => {
      if (status === 'success') return 'border-green-500 bg-green-500/10 text-green-400';
      if (status === 'failed') return 'border-destructive bg-destructive/10 text-destructive';
      if (status === 'executing') return 'border-primary bg-primary/10 text-primary animate-pulse';
      return 'border-muted bg-accent text-muted-foreground';
    };

    return (
      <div className={`px-4 py-2 shadow-md rounded-md bg-background border-2 ${getStatusColor(data.status)} min-w-[150px] transition-all cursor-pointer ${data.isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105' : 'hover:scale-105'}`}>
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 bg-muted-foreground" />
        <div className="flex flex-col">
          <div className="text-xs font-mono uppercase opacity-70 mb-1">{data.type}</div>
          <div className="text-sm font-semibold">{data.name}</div>
          {data.duration !== undefined && data.duration !== null && <div className="text-xs mt-1 opacity-50">{data.duration.toFixed(2)}s</div>}
        </div>
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 bg-muted-foreground" />
      </div>
    );
  },
};

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 172;
  const nodeHeight = 80;

  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

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

export default function TraceViewer({ runId, runStatus }: { runId: string, runStatus?: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { selectedNodeId, setSelectedNodeId, currentTime, setMaxTime, setCurrentTime } = useTraceStore();

  const { data: steps, isLoading } = useQuery({
    queryKey: ['steps', runId],
    queryFn: async () => {
      const res = await apiFetch(`/api/steps/run/${runId}`);
      if (!res.ok) throw new Error('Network error');
      return res.json();
    },
    refetchInterval: runStatus === 'running' ? 1000 : false
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
          style: { stroke: '#6b7280' },
        }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(baseNodes, baseEdges);

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setMaxTime(maxEnd - firstStart);
      setCurrentTime(maxEnd - firstStart); // default to end of run
    }
  }, [steps, setNodes, setEdges, setMaxTime, setCurrentTime]);

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
          opacity = 0.3; // Dim future nodes
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
        const targetNode = nodes.find(n => n.id === e.target);
        if (!targetNode) return e;
        
        const { startMs, endMs } = targetNode.data;
        const isExecuting = currentTime >= startMs && currentTime < endMs;
        const isCompleted = currentTime >= endMs;
        const targetFailed = targetNode.data.finalStatus === 'failed';

        return {
          ...e,
          animated: isExecuting,
          style: { 
            stroke: (isCompleted && targetFailed) ? '#ef4444' : (isExecuting ? '#3b82f6' : '#6b7280'),
            opacity: currentTime < startMs ? 0.3 : 1
          },
        };
      })
    );
  }, [currentTime, steps, selectedNodeId]); // intentionally excluded nodes/edges to prevent infinite loops

  const onNodeClick = useCallback((_event: any, node: any) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  if (isLoading) return <div className="flex h-full items-center justify-center p-12"><div className="text-primary animate-pulse font-mono">Loading trace...</div></div>;

  return (
    <div className="w-full h-[calc(100vh-100px)] md:h-full bg-background relative border border-border rounded-lg overflow-hidden flex flex-col md:flex-row">
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
          <Background color="#171717" gap={16} />
          <Controls className="fill-foreground bg-accent border-border" />
          <MiniMap nodeColor={(n: any) => {
            if (n.data?.status === 'failed') return '#ef4444';
            if (n.data?.status === 'success') return '#22c55e';
            if (n.data?.status === 'executing') return '#3b82f6';
            return '#262626';
          }} maskColor="#00000040" className="bg-background border border-border" />
        </ReactFlow>
        {steps && steps.length > 0 && <PlaybackControls />}
      </div>
      <NodeInspector steps={steps || []} />
    </div>
  );
}
