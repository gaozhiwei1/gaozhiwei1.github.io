import json, re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
bank_path = root / 'LLM_Interview_Handbook' / 'interview_bank_2026_v1.json'
bank = json.loads(bank_path.read_text(encoding='utf-8'))
questions = bank['theory_questions']

# Map interview-bank topics to the closest existing knowledge node.  This keeps
# the question list grouped by the current curriculum without changing node IDs.
def node_for(q):
    t = q['title']
    cid = q['id']
    checks = [
        (['Q、K、V','Q/K/V'], 'transformer.attention.qkv'),
        (['sqrt{d_k}','sqrt','√d'], 'transformer.attention.scaling'),
        (['Multi-Head Attention'], 'transformer.multihead.why'),
        (['Causal Mask'], 'transformer.attention.masks'),
        (['位置编码'], 'transformer.position.why'),
        (['RoPE'], 'transformer.position.rope'),
        (['RMSNorm','LayerNorm'], 'transformer.norm.layer-rms'),
        (['Pre-Norm','Post-Norm'], 'transformer.norm.pre-post'),
        (['SwiGLU'], 'transformer.ffn.swiglu'),
        (['FFN'], 'transformer.ffn.standard'),
        (['MHA','MQA','GQA'], 'transformer.multihead.gqa'),
        (['Self-Attention 的时间','Attention 的时间'], 'transformer.attention.tensor-path'),
        (['Decoder-only','Decoder-only'], 'decoder.architecture.families'),
        (['LLaMA'], 'decoder.architecture.modern-block'),
        (['FlashAttention'], 'inference.kernel.flashattention'),
        (['KV Cache 显存'], 'inference.cache.memory-bandwidth'),
        (['KV Cache'], 'inference.cache.kv'),
        (['Prefill','Decode'], 'inference.cache.prefill-decode'),
        (['left padding'], 'inference.cache.prefill-decode'),
        (['PagedAttention'], 'inference.serving.pagedattention'),
        (['Continuous Batching'], 'inference.serving.continuous-batching'),
        (['Speculative Decoding'], 'inference.serving.speculative'),
        (['Temperature','Top-k','Top-p'], 'inference.generation.topk-topp'),
        (['量化'], 'inference.quantization.formats'),
        (['GPTQ','AWQ'], 'inference.quantization.gptq-awq'),
        (['TTFT','TPOT','Latency','Throughput'], 'inference.cache.prefill-decode'),
        (['长上下文'], 'inference.cache.memory-bandwidth'),
        (['Causal LM','targets'], 'decoder.objective.logits-loss'),
        (['Cross Entropy','NLL','KL'], 'math.probability.entropy-crossentropy-kl'),
        (['Perplexity'], 'evaluation.metrics.loss-perplexity'),
        (['词表'], 'tokenization.vocab-fertility'),
        (['BPE'], 'tokenization.bpe'),
        (['BF16','FP16'], 'pretraining.training.precision'),
        (['AdamW'], 'math.optimization.adamw'),
        (['warmup','gradient clipping'], 'math.optimization.lr-warmup'),
        (['Scaling Law','Chinchilla'], 'pretraining.scaling.compute-optimal'),
        (['去重','质量过滤','污染检测'], 'pretraining.data.filtering-dedup'),
        (['SFT'], 'posttraining.sft.masking'),
        (['经典 RLHF'], 'posttraining.preference.reward-model'),
        (['Reward Model 常见','pairwise loss'], 'posttraining.preference.bradley-terry'),
        (['Reward Model 和 Critic','Value Model'], 'posttraining.rl.value-advantage'),
        (['Policy Gradient'], 'posttraining.rl.policy-gradient'),
        (['State Value','Action Value','Advantage'], 'posttraining.rl.value-advantage'),
        (['GAE'], 'posttraining.ppo.gae-kl'),
        (['importance-sampling ratio'], 'posttraining.ppo.ratio'),
        (['clip objective','clip objective'], 'posttraining.ppo.clipping'),
        (['PPO 的 loss','最小化'], 'posttraining.ppo.clipping'),
        (['reference policy','old policy'], 'posttraining.ppo.ratio'),
        (['PPO 做 RLHF','几个模型'], 'posttraining.ppo.gae-kl'),
        (['DPO 的核心','DPO 的'], 'posttraining.dpo.objective'),
        (['DPO 的 $\\beta$','DPO 的 β'], 'posttraining.dpo.objective'),
        (['PPO 和 DPO'], 'posttraining.dpo.objective'),
        (['GRPO 相比','GRPO 需要'], 'posttraining.grpo.objective'),
        (['Outcome Reward','Process Reward','Verifier'], 'reasoning.training.process-outcome'),
        (['Tensor Parallel'], 'distributed.tensor.tp'),
        (['Data Parallel','Pipeline Parallel'], 'distributed.data.ddp'),
        (['ZeRO'], 'distributed.zero.stages'),
        (['7B 模型','Adam state','显存'], 'pretraining.training.memory'),
        (['LoRA 的数学'], 'peft.lora.update'),
        (['LoRA 的 A/B'], 'peft.lora.update'),
        (['LoRA rank'], 'peft.lora.update'),
        (['QLoRA'], 'peft.qlora.quantized-base'),
        (['MoE 相比 Dense'], 'moe.routing.why-ffn'),
        (['load-balancing'], 'moe.routing.balance'),
        (['RAG 的完整'], 'evaluation.applications.rag-agent'),
        (['Chunk'], 'evaluation.applications.rag-agent'),
        (['Reranker'], 'evaluation.applications.rag-agent'),
        (['RAG 的主要'], 'evaluation.applications.rag-agent'),
        (['Agent 与 Workflow'], 'evaluation.applications.rag-agent'),
        (['Tool、MCP、Skill'], 'evaluation.applications.rag-agent'),
        (['Agent 怎么评估'], 'evaluation.applications.rag-agent'),
        (['生成式 LLM 的评测'], 'evaluation.judge.preference'),
        (['一致性','可控性'], 'evaluation.reliability.calibration'),
        (['InfoNCE'], 'math.probability.entropy-crossentropy-kl'),
        (['MSE 已收敛','排序效果'], 'evaluation.metrics.passk'),
    ]
    for words, node in checks:
        if any(w in t for w in words):
            return node
    fallback = {
        'Transformer': 'transformer.attention.why',
        '推理与系统': 'inference.cache.prefill-decode',
        '预训练': 'pretraining.training.batch-accumulation',
        '数学基础': 'math.probability.entropy-crossentropy-kl',
        'Tokenizer': 'tokenization.granularity',
        '训练系统': 'pretraining.training.precision',
        '优化': 'math.optimization.gradient-sgd',
        'Post-training': 'posttraining.sft.masking',
        '强化学习': 'posttraining.rl.policy-gradient',
        '分布式': 'distributed.data.ddp',
        'PEFT': 'peft.lora.update',
        'MoE': 'moe.routing.why-ffn',
        'RAG/Agent': 'evaluation.applications.rag-agent',
        '评测': 'evaluation.judge.preference',
        '检索': 'evaluation.applications.rag-agent',
    }
    return fallback.get(q['category'], 'evaluation.metrics.loss-perplexity')

def topic_for(node):
    return node.split('.')[0] if not node.startswith('posttraining') else 'post-training'

def category_for(q):
    title = q['title']
    cat = q['category']
    if q.get('equations') and cat not in {'推理与系统','分布式','RAG/Agent'}:
        return '数学推导'
    if cat in {'推理与系统','分布式','训练系统','PEFT','MoE'}:
        return '工程理解'
    if cat in {'RAG/Agent'}:
        return 'System Design'
    if any(k in title for k in ['为什么可能','短板','污染','hacking','退化','变差']):
        return 'Debugging'
    return '基础理解'

def ts(s):
    # JSON string literal is valid TS and handles newlines/Unicode safely.
    return json.dumps(s, ensure_ascii=False)

client_lines = [
    'import type { Question } from "../types";',
    '',
    '// Generated from the earlier Math2LLM interview handbook. Answers are',
    '// intentionally NOT shipped in the client bundle; PRO answers live under server/saas.',
    'export const interviewBankQuestions: Question[] = [',
]
answers = {}
for q in questions:
    qid = 'bank-' + q['id'].lower()
    node = node_for(q)
    difficulty = q['difficulty'] if q['difficulty'] in {'基础','进阶','困难'} else '进阶'
    tags = []
    for tag in [q['category'], *q.get('source_tags', [])]:
        if tag and tag not in tags: tags.append(tag)
    client_lines += [
        '  {',
        f'    id: {ts(qid)},',
        f'    topicId: {ts(topic_for(node))},',
        f'    nodeId: {ts(node)},',
        f'    treeId: {ts(node)},',
        f'    category: {ts(category_for(q))},',
        '    type: "self",',
        f'    difficulty: {ts(difficulty)},',
        f'    frequency: {ts(q.get("frequency", ""))},',
        f'    title: {ts(q["title"])},',
        f'    prompt: {ts("请先用 20–30 秒给出结构化回答，再解释关键机制、数学关系和容易答错的边界。")},',
        '    shortAnswer: "",',
        '    explanation: "",',
        '    followUps: [],',
        '    equations: [],',
        '    pitfalls: [],',
        f'    reference: {ts("LLM 面经补充题 · " + q["id"])},',
        f'    tags: {json.dumps(tags[:4], ensure_ascii=False)},',
        f'    sourceTags: {json.dumps(q.get("source_tags", []), ensure_ascii=False)},',
        '  },'
    ]
    answers[qid] = {
        'shortAnswer': q.get('short_answer',''),
        'explanation': '\n\n'.join(q.get('explanation',[])),
        'equations': q.get('equations',[]),
        'pitfalls': q.get('pitfalls',[]),
        'followUps': q.get('followups',[]),
        'sourceTags': q.get('source_tags',[]),
    }
client_lines += ['];', '']
(root/'src/data/interviewBankQuestions.ts').write_text('\n'.join(client_lines), encoding='utf-8')
(root/'server/saas/interview-bank-answers.json').write_text(json.dumps(answers, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(f'Generated {len(questions)} protected interview-bank question shells.')
