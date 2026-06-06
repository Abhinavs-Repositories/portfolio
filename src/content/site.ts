export type DataArtKey =
  | 'RetrievalField'
  | 'AgentOrchestration'
  | 'MessageTraffic'
  | 'CircuitTelemetry';

export type Project = {
  id: string;
  title: string;          // anonymized name
  role: string;           // one line: what the person owned
  summary: string;        // 1-2 sentence what-it-is
  highlights: string[];   // 2-4 concrete bullets with metrics
  stack: string[];        // tech chips
  metric: { value: string; label: string };
  dataArt: DataArtKey;
};

export const hero = {
  eyebrow: 'AI Engineer · Bengaluru',
  // headline split into lines; "think" is the italic+amber emphasis
  lines: [
    ['Systems that'],
    [{ italic: true as const, text: 'think' }, ' in'],
    ['production.'],
  ],
  sub: 'I build LLM, RAG and multi-agent systems for banking. The kind that ship, scale to hundreds of thousands of users, and quietly run the things people depend on.',
};

export const about = {
  num: '01 · Profile',
  title: { plain: 'Engineering intelligence,', emphasis: 'not just demos.' },
  paragraphs: [
    "I'm a Specialist Programmer at Infosys, embedded full-time with a major European bank, with around 2.5 years building production AI in the BFSI domain. I work across the full lifecycle: data ingestion, chunking, embeddings, retrieval tuning, agent orchestration, evaluation, guardrails, and production deployment.",
    "My work lives where the stakes are real: compliance automation, multilingual knowledge assistants, and customer-facing agents on AWS Bedrock. I tend to own systems end to end, from the retrieval layer down to the infrastructure. Aggressive on architecture, allergic to generic.",
  ],
  stats: [
    { value: '5,000+', label: 'Advisors served in production' },
    { value: '3mo → 15min', label: 'Compliance assessment, compressed' },
    { value: '150–200K', label: 'Monthly users targeted on Bedrock' },
    { value: '6 min → <1s', label: 'Query resolution time' },
  ],
};

export const work = {
  num: '02 · Selected Work',
  title: { plain: "Things I've", emphasis: 'shipped.' },
};

export const projects: Project[] = [
  {
    id: 'knowledge-assistant',
    title: 'Multilingual Knowledge Assistant',
    role: 'Sole owner of the search and retrieval layer.',
    summary:
      'A multilingual RAG knowledge assistant in production for 5,000+ daily banking advisors across three language markets, turning a sprawling internal knowledge base into instant, sourced answers.',
    highlights: [
      'Built the retrieval layer on Elasticsearch with hybrid kNN + BM25 search, plus a daily incremental ingestion pipeline with article version control.',
      'Drove the embedding-model migration decision through evaluation, moving from ada-002 to text-embedding-3-large.',
      'Shipped to production in January 2025, cutting average query resolution from about 6 minutes to under 1 second.',
      'Validated pre-launch with 20 advisors across 611 evaluated question-answer pairs.',
    ],
    stack: ['Elasticsearch (hybrid kNN + BM25)', 'OpenAI embeddings', 'FastAPI', 'Python', 'LangChain'],
    metric: { value: '5,000+', label: 'Advisors · in production' },
    dataArt: 'RetrievalField',
  },
  {
    id: 'compliance-platform',
    title: 'Compliance Automation Platform',
    role: 'Sole developer of the full system.',
    summary:
      'A multi-agent compliance automation platform that collapses a three-month manual risk-control self-assessment into 15 to 20 minutes, in production with 400+ risk officers across three countries.',
    highlights: [
      '27-endpoint FastAPI backend orchestrating 6 specialized agents (risk identification, inherent / control / residual assessment, context extraction, questionnaire evaluation) across a five-phase conversation state machine.',
      'Document ingestion pipeline handling DOCX, PDF and images, with a vector store managing up to 10,000 files across concurrent sessions.',
      'Distributed conversation state via DynamoDB session persistence, with custom parallel function calling.',
      'Stage-gated architecture with server-side prerequisite enforcement, real-time 0 to 100% progress, and retry logic with exponential backoff.',
    ],
    stack: ['OpenAI Assistants API', 'FastAPI', 'DynamoDB', 'S3', 'Elasticsearch', 'Streamlit'],
    metric: { value: '~15 min', label: 'Down from 3 months' },
    dataArt: 'AgentOrchestration',
  },
  {
    id: 'customer-chatbot',
    title: 'Customer Chatbot',
    role: 'Owned the RAG pipeline, tool design and infrastructure.',
    summary:
      'A customer-facing agentic chatbot on AWS Bedrock AgentCore, architected for scale toward 150 to 200K monthly users, with safety and observability built in.',
    highlights: [
      'Built on Bedrock AgentCore Runtime and the Strands SDK, with a Bedrock Knowledge Base over OpenSearch Serverless and Bedrock Guardrails.',
      'Owned the S3 to Knowledge Base ingestion pipeline and a retrieval tool calling the Bedrock Retrieve API.',
      'Designed sliding-window conversation management, S3 session handling, and a three-layer per-invocation config override system.',
      'Full Terraform infrastructure and GitHub Actions CI/CD, with Phoenix / OpenTelemetry observability and active latency optimization toward a sub-3-second response.',
    ],
    stack: [
      'AWS Bedrock AgentCore',
      'Strands SDK',
      'OpenSearch Serverless',
      'Bedrock Guardrails',
      'Terraform',
      'GitHub Actions',
    ],
    metric: { value: '150–200K', label: 'Monthly users targeted' },
    dataArt: 'MessageTraffic',
  },
  {
    id: 'pitwall-ai',
    title: 'Pitwall-AI',
    role: 'Solo side project.',
    summary:
      'A Formula One race-strategy multi-agent system built entirely on a zero-cost stack, where the AI work meets the obsession.',
    highlights: [
      'LangGraph orchestration over the OpenF1 API, with Groq-hosted Llama 3.3 70B inference and a Gemini Flash fallback.',
      'Qdrant vector store for retrieval, deployed live at zero infrastructure cost.',
    ],
    stack: ['LangGraph', 'OpenF1 API', 'Llama 3.3 70B (Groq)', 'Qdrant'],
    metric: { value: '$0', label: 'Infra cost' },
    dataArt: 'CircuitTelemetry',
  },
];

export const contact = {
  num: '03 · Contact',
  // headline parts; "ships." is italic + amber
  headline: { plain: "Let's build\nsomething that", emphasis: 'ships.' },
  links: [
    { label: 'LinkedIn', href: 'https://linkedin.com/in/abhinavsinghh', external: true },
    { label: 'GitHub', href: 'https://github.com/Abhinavs-Repositories', external: true },
    { label: 'Email', href: 'mailto:abhi.s.pearce.007@gmail.com', external: false },
  ],
};

export const footerCopy = {
  left: '© 2026 Abhinav Singh',
  right: 'Built with intent',
};

export const nav = {
  logo: 'Abhinav',
  links: [
    { label: 'About', href: '#about' },
    { label: 'Work', href: '#work' },
    { label: 'Contact', href: '#contact' },
  ],
};
