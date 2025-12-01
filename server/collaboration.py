"""
Multi-Agent Collaboration System

Enables agents to work together on complex tasks through:
- Agent-to-agent communication
- Task delegation
- Consensus building
- Shared knowledge base access
"""

from typing import List, Dict, Optional, Any
from datetime import datetime
from uuid import UUID, uuid4
from pydantic import BaseModel, Field
from enum import Enum
import asyncio


class CollaborationMode(str, Enum):
    """Types of agent collaboration."""
    SEQUENTIAL = "sequential"  # Agents work one after another
    PARALLEL = "parallel"  # Agents work simultaneously
    HIERARCHICAL = "hierarchical"  # Lead agent delegates to subordinates
    CONSENSUS = "consensus"  # Agents vote on decisions


class AgentMessage(BaseModel):
    """Message between agents."""
    id: UUID = Field(default_factory=uuid4)
    from_agent_id: UUID
    to_agent_id: UUID
    message_type: str
    content: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    requires_response: bool = False
    response_to: Optional[UUID] = None


class TaskDelegation(BaseModel):
    """Task delegated from one agent to another."""
    id: UUID = Field(default_factory=uuid4)
    delegator_agent_id: UUID
    delegate_agent_id: UUID
    task_description: str
    task_data: Dict[str, Any] = Field(default_factory=dict)
    priority: int = 5
    deadline: Optional[datetime] = None
    status: str = "pending"
    result: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class ConsensusVote(BaseModel):
    """Vote in a consensus decision."""
    agent_id: UUID
    decision_id: UUID
    vote: str  # e.g., "approve", "reject", "abstain"
    confidence: float  # 0.0 to 1.0
    rationale: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ConsensusDecision(BaseModel):
    """Multi-agent consensus decision."""
    id: UUID = Field(default_factory=uuid4)
    topic: str
    data: Dict[str, Any]
    participating_agents: List[UUID]
    votes: List[ConsensusVote] = Field(default_factory=list)
    threshold: float = 0.67  # % agreement needed
    status: str = "voting"
    final_decision: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    decided_at: Optional[datetime] = None


class CollaborationSession(BaseModel):
    """Multi-agent collaboration session."""
    id: UUID = Field(default_factory=uuid4)
    name: str
    mode: CollaborationMode
    participating_agents: List[UUID]
    lead_agent_id: Optional[UUID] = None
    goal: str
    context: Dict[str, Any] = Field(default_factory=dict)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    status: str = "active"
    results: Optional[Dict[str, Any]] = None


class AgentCollaborationEngine:
    """
    Orchestrates multi-agent collaboration.
    """
    
    def __init__(self):
        self.sessions: Dict[str, CollaborationSession] = {}
        self.messages: Dict[str, List[AgentMessage]] = {}
        self.delegations: Dict[str, TaskDelegation] = {}
        self.consensus_decisions: Dict[str, ConsensusDecision] = {}
    
    async def create_session(
        self,
        name: str,
        mode: CollaborationMode,
        participating_agents: List[UUID],
        goal: str,
        lead_agent_id: Optional[UUID] = None
    ) -> CollaborationSession:
        """
        Create a new collaboration session.
        
        Args:
            name: Session name
            mode: Collaboration mode
            participating_agents: List of agent UUIDs
            goal: Session goal/objective
            lead_agent_id: Optional lead agent (for hierarchical mode)
        
        Returns:
            Created collaboration session
        """
        session = CollaborationSession(
            name=name,
            mode=mode,
            participating_agents=participating_agents,
            lead_agent_id=lead_agent_id,
            goal=goal
        )
        
        self.sessions[str(session.id)] = session
        self.messages[str(session.id)] = []
        
        return session
    
    async def send_message(
        self,
        session_id: UUID,
        from_agent_id: UUID,
        to_agent_id: UUID,
        message_type: str,
        content: Dict[str, Any],
        requires_response: bool = False
    ) -> AgentMessage:
        """
        Send message between agents in a session.
        
        Args:
            session_id: Collaboration session UUID
            from_agent_id: Sender agent UUID
            to_agent_id: Recipient agent UUID
            message_type: Type of message
            content: Message content
            requires_response: Whether response is required
        
        Returns:
            Created message
        """
        message = AgentMessage(
            from_agent_id=from_agent_id,
            to_agent_id=to_agent_id,
            message_type=message_type,
            content=content,
            requires_response=requires_response
        )
        
        if str(session_id) in self.messages:
            self.messages[str(session_id)].append(message)
        
        return message
    
    async def delegate_task(
        self,
        delegator_agent_id: UUID,
        delegate_agent_id: UUID,
        task_description: str,
        task_data: Dict[str, Any],
        priority: int = 5,
        deadline: Optional[datetime] = None
    ) -> TaskDelegation:
        """
        Delegate task from one agent to another.
        
        Args:
            delegator_agent_id: Delegating agent UUID
            delegate_agent_id: Receiving agent UUID
            task_description: Task description
            task_data: Task input data
            priority: Task priority (1-10)
            deadline: Optional deadline
        
        Returns:
            Created task delegation
        """
        delegation = TaskDelegation(
            delegator_agent_id=delegator_agent_id,
            delegate_agent_id=delegate_agent_id,
            task_description=task_description,
            task_data=task_data,
            priority=priority,
            deadline=deadline
        )
        
        self.delegations[str(delegation.id)] = delegation
        
        return delegation
    
    async def complete_delegation(
        self,
        delegation_id: UUID,
        result: Dict[str, Any]
    ):
        """
        Mark delegated task as complete.
        
        Args:
            delegation_id: Delegation UUID
            result: Task result data
        """
        delegation = self.delegations.get(str(delegation_id))
        if not delegation:
            raise ValueError(f"Delegation {delegation_id} not found")
        
        delegation.status = "completed"
        delegation.result = result
        delegation.completed_at = datetime.utcnow()
    
    async def initiate_consensus(
        self,
        session_id: UUID,
        topic: str,
        data: Dict[str, Any],
        threshold: float = 0.67
    ) -> ConsensusDecision:
        """
        Initiate consensus decision among agents.
        
        Args:
            session_id: Collaboration session UUID
            topic: Decision topic
            data: Decision data
            threshold: Agreement threshold (0.0-1.0)
        
        Returns:
            Created consensus decision
        """
        session = self.sessions.get(str(session_id))
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        decision = ConsensusDecision(
            topic=topic,
            data=data,
            participating_agents=session.participating_agents,
            threshold=threshold
        )
        
        self.consensus_decisions[str(decision.id)] = decision
        
        return decision
    
    async def cast_vote(
        self,
        decision_id: UUID,
        agent_id: UUID,
        vote: str,
        confidence: float,
        rationale: Optional[str] = None
    ) -> ConsensusVote:
        """
        Cast vote in consensus decision.
        
        Args:
            decision_id: Decision UUID
            agent_id: Voting agent UUID
            vote: Vote value
            confidence: Confidence level (0.0-1.0)
            rationale: Optional vote rationale
        
        Returns:
            Created vote
        """
        decision = self.consensus_decisions.get(str(decision_id))
        if not decision:
            raise ValueError(f"Decision {decision_id} not found")
        
        vote_obj = ConsensusVote(
            agent_id=agent_id,
            decision_id=decision_id,
            vote=vote,
            confidence=confidence,
            rationale=rationale
        )
        
        decision.votes.append(vote_obj)
        
        # Check if consensus reached
        await self._check_consensus(decision)
        
        return vote_obj
    
    async def _check_consensus(self, decision: ConsensusDecision):
        """Check if consensus has been reached."""
        if len(decision.votes) < len(decision.participating_agents):
            return  # Not all agents have voted
        
        # Count weighted votes
        vote_counts: Dict[str, float] = {}
        total_confidence = 0.0
        
        for vote in decision.votes:
            if vote.vote not in vote_counts:
                vote_counts[vote.vote] = 0.0
            vote_counts[vote.vote] += vote.confidence
            total_confidence += vote.confidence
        
        # Determine if consensus reached
        if total_confidence > 0:
            for vote_option, weighted_count in vote_counts.items():
                agreement_rate = weighted_count / total_confidence
                if agreement_rate >= decision.threshold:
                    decision.status = "decided"
                    decision.final_decision = vote_option
                    decision.decided_at = datetime.utcnow()
                    return
        
        # No consensus
        decision.status = "no_consensus"
        decision.decided_at = datetime.utcnow()
    
    async def execute_sequential(
        self,
        session_id: UUID
    ) -> Dict[str, Any]:
        """Execute agents sequentially."""
        session = self.sessions.get(str(session_id))
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        results = []
        context = session.context.copy()
        
        for agent_id in session.participating_agents:
            # Execute agent with current context
            result = await self._execute_agent(agent_id, context)
            results.append({
                "agent_id": str(agent_id),
                "result": result
            })
            
            # Update context for next agent
            context.update(result)
        
        session.results = {"sequential_results": results}
        session.status = "completed"
        session.completed_at = datetime.utcnow()
        
        return session.results
    
    async def execute_parallel(
        self,
        session_id: UUID
    ) -> Dict[str, Any]:
        """Execute agents in parallel."""
        session = self.sessions.get(str(session_id))
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Execute all agents concurrently
        tasks = [
            self._execute_agent(agent_id, session.context)
            for agent_id in session.participating_agents
        ]
        
        results = await asyncio.gather(*tasks)
        
        session.results = {
            "parallel_results": [
                {"agent_id": str(agent_id), "result": result}
                for agent_id, result in zip(session.participating_agents, results)
            ]
        }
        session.status = "completed"
        session.completed_at = datetime.utcnow()
        
        return session.results
    
    async def _execute_agent(
        self,
        agent_id: UUID,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a single agent (mock implementation)."""
        await asyncio.sleep(0.5)  # Simulate execution
        return {
            "agent_id": str(agent_id),
            "output": f"Processed with context: {list(context.keys())}"
        }


# Global collaboration engine instance
collaboration_engine = AgentCollaborationEngine()
