import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { readDB, writeDB, hashPassword } from './server-db';
import { User, ConstructionSite, Material, ConstructionParameter, TeamMessage, Blueprint } from './src/types';

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log('Gemini client initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize Gemini Client:', err);
  }
} else {
  console.log('No GEMINI_API_KEY env found. AI features will use rule-based fallback estimates.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json({ limit: '50mb' })); // Allow uploading Base64 blueprints

  // Custom Authentication Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
    }

    const db = readDB();
    // In this simple custom auth system, the token is simply the userId for robustness and easy previewing
    const user = db.users.find(u => u.id === token);
    if (!user) {
      return res.status(403).json({ error: 'Sessão inválida ou expirada.' });
    }

    req.user = user;
    next();
  };

  // --- API ROUTES ---

  // Auth: Registrar Conta
  app.post('/api/auth/register', (req, res) => {
    const { username, password, name, role } = req.body;

    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    }

    const db = readDB();
    const existing = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Nome de usuário já está em uso.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);

    const newUser = {
      id: crypto.randomUUID(),
      username: username.toLowerCase(),
      name,
      role,
      passwordHash,
      salt
    };

    db.users.push(newUser);
    writeDB(db);

    const { passwordHash: _, salt: __, ...userResponse } = newUser;
    res.status(201).json({ success: true, user: userResponse, token: newUser.id });
  });

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Informe usuário e senha.' });
    }

    const db = readDB();
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      return res.status(400).json({ error: 'Usuário ou senha incorretos.' });
    }

    const calculatedHash = hashPassword(password, user.salt);
    if (calculatedHash !== user.passwordHash) {
      return res.status(400).json({ error: 'Usuário ou senha incorretos.' });
    }

    const { passwordHash: _, salt: __, ...userResponse } = user;
    res.json({ success: true, user: userResponse, token: user.id });
  });

  // Auth: Obter Usuário Atual (Me)
  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    const { passwordHash: _, salt: __, ...userResponse } = req.user;
    res.json(userResponse);
  });

  // Listar Usuários (Para equipe / atribuição de tarefas)
  app.get('/api/users', authenticateToken, (req, res) => {
    const db = readDB();
    const usersList = db.users.map(({ passwordHash, salt, ...user }) => user);
    res.json(usersList);
  });

  // --- SITES (OBRAS) ---

  // Listar todas as obras
  app.get('/api/sites', authenticateToken, (req, res) => {
    const db = readDB();
    res.json(db.sites);
  });

  // Criar nova obra (Engenheiro apenas)
  app.post('/api/sites', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'engineer') {
      return res.status(403).json({ error: 'Apenas engenheiros podem criar novas obras.' });
    }

    const { name, location, clientName, clientPhone, startDate, endDate } = req.body;
    if (!name || !location) {
      return res.status(400).json({ error: 'Nome e localização são obrigatórios.' });
    }

    const db = readDB();
    const newSite: ConstructionSite = {
      id: crypto.randomUUID(),
      name,
      location,
      clientName: clientName || '',
      clientPhone: clientPhone || '',
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || '',
      status: 'planning',
      percentage: 0
    };

    db.sites.push(newSite);
    writeDB(db);

    res.status(201).json(newSite);
  });

  // Deletar obra (Engenheiro apenas)
  app.delete('/api/sites/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'engineer') {
      return res.status(403).json({ error: 'Apenas engenheiros podem deletar obras.' });
    }

    const { id } = req.params;
    const db = readDB();
    
    db.sites = db.sites.filter(s => s.id !== id);
    db.materials = db.materials.filter(m => m.siteId !== id);
    db.parameters = db.parameters.filter(p => p.siteId !== id);
    db.messages = db.messages.filter(msg => msg.siteId !== id);
    db.blueprints = db.blueprints.filter(b => b.siteId !== id);
    
    writeDB(db);
    res.json({ success: true });
  });

  // --- MATERIALS ---

  // Listar materiais de uma obra
  app.get('/api/sites/:siteId/materials', authenticateToken, (req, res) => {
    const { siteId } = req.params;
    const db = readDB();
    const siteMaterials = db.materials.filter(m => m.siteId === siteId);
    res.json(siteMaterials);
  });

  // Adicionar material
  app.post('/api/sites/:siteId/materials', authenticateToken, (req: any, res) => {
    // Workers cannot edit or add materials
    if (req.user.role === 'worker') {
      return res.status(403).json({ error: 'Permissão insuficiente.' });
    }

    const { siteId } = req.params;
    const { name, quantityNeeded, quantityReceived, unit } = req.body;

    if (!name || quantityNeeded === undefined || !unit) {
      return res.status(400).json({ error: 'Nome, quantidade necessária e unidade são obrigatórios.' });
    }

    const db = readDB();
    const newMaterial: Material = {
      id: crypto.randomUUID(),
      siteId,
      name,
      quantityNeeded: Number(quantityNeeded),
      quantityReceived: Number(quantityReceived || 0),
      unit,
      guests: req.body.guests || [],
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.name
    };

    db.materials.push(newMaterial);
    writeDB(db);
    res.status(201).json(newMaterial);
  });

  // Atualizar quantidade de material (Ex: Registrar chegada de material)
  app.put('/api/sites/:siteId/materials/:id', authenticateToken, (req: any, res) => {
    if (req.user.role === 'worker') {
      return res.status(403).json({ error: 'Permissão insuficiente.' });
    }

    const { siteId, id } = req.params;
    const { quantityReceived, quantityNeeded, name, unit, guests } = req.body;

    const db = readDB();
    const materialIndex = db.materials.findIndex(m => m.id === id && m.siteId === siteId);

    if (materialIndex === -1) {
      return res.status(404).json({ error: 'Material não encontrado.' });
    }

    const mat = db.materials[materialIndex];
    if (quantityReceived !== undefined) mat.quantityReceived = Number(quantityReceived);
    if (quantityNeeded !== undefined) mat.quantityNeeded = Number(quantityNeeded);
    if (name !== undefined) mat.name = name;
    if (unit !== undefined) mat.unit = unit;
    if (guests !== undefined) mat.guests = guests;

    mat.updatedAt = new Date().toISOString();
    mat.updatedBy = req.user.name;

    writeDB(db);
    res.json(mat);
  });

  // Remover material
  app.delete('/api/sites/:siteId/materials/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'engineer' && req.user.role !== 'master_builder') {
      return res.status(403).json({ error: 'Apenas engenheiros ou mestres de obra podem excluir materiais.' });
    }

    const { siteId, id } = req.params;
    const db = readDB();
    
    db.materials = db.materials.filter(m => !(m.id === id && m.siteId === siteId));
    writeDB(db);
    res.json({ success: true });
  });

  // ESTIMADOR INTELIGENTE DE MATERIAIS COM GEMINI AI
  app.post('/api/sites/:siteId/materials/estimate', authenticateToken, async (req: any, res) => {
    if (req.user.role === 'worker') {
      return res.status(403).json({ error: 'Permissão insuficiente.' });
    }

    const { siteId } = req.params;
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Descreva o serviço para estimativa (ex: reboco de 40m2).' });
    }

    // Attempt to call Gemini if initialized
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: `Você é um engenheiro civil experiente e especialista em quantitativo de materiais. 
          O usuário solicitou estimar materiais para a seguinte descrição de serviço em português: "${prompt}".
          Estime os materiais necessários de forma precisa para a construção civil brasileira.
          
          Retorne os dados estritamente em formato JSON contendo uma lista de materiais. Cada material deve possuir:
          - "name": Nome do material (em português, ex: Cimento CP-II, Areia Média, Tijolo Baiano 8 Furos)
          - "quantityNeeded": Quantidade numérica sugerida necessária
          - "unit": Unidade brasileira adequada (ex: sacos, m³, kg, unidades, litros)
          - "explanation": Explicação curta e didática do cálculo ou de por que este material é necessário.

          Responda apenas com o JSON estruturado, sem blocos de código markdown adicionais ou introduções.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantityNeeded: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ['name', 'quantityNeeded', 'unit', 'explanation']
              }
            }
          }
        });

        const jsonText = response.text ? response.text.trim() : '[]';
        const estimatedMaterials = JSON.parse(jsonText);

        return res.json({ success: true, materials: estimatedMaterials });
      } catch (geminiErr) {
        console.error('Error calling Gemini API:', geminiErr);
        // Fallback to rule-based parser on Gemini failure
      }
    }

    // Rule-based Fallback Estimator if Gemini isn't available or fails
    console.log('Using rule-based fallback estimates...');
    const lowerPrompt = prompt.toLowerCase();
    let fallbackResult: any[] = [];

    if (lowerPrompt.includes('reboco') || lowerPrompt.includes('emboço')) {
      const match = lowerPrompt.match(/\d+/);
      const area = match ? Number(match[0]) : 50; // default 50m2
      fallbackResult = [
        { name: 'Cimento CP-II', quantityNeeded: Math.ceil(area * 0.25), unit: 'sacos', explanation: `Estimado para reboco de ${area}m² (traço médio de 1:4 com 2cm de espessura).` },
        { name: 'Areia Fina/Média', quantityNeeded: Number((area * 0.02 * 1.15).toFixed(2)), unit: 'm³', explanation: `Areia necessária calculada para espessura média de 2cm + 15% de perda.` },
        { name: 'Cal Hidratada (CH-I)', quantityNeeded: Math.ceil(area * 0.2), unit: 'sacos', explanation: 'Utilizada para dar plasticidade e evitar trincas na cura do reboco.' }
      ];
    } else if (lowerPrompt.includes('concreto') || lowerPrompt.includes('laje') || lowerPrompt.includes('fundação')) {
      const match = lowerPrompt.match(/\d+/);
      const volume = match ? Number(match[0]) : 5; // default 5m3
      fallbackResult = [
        { name: 'Cimento CP-V ARI', quantityNeeded: Math.ceil(volume * 7), unit: 'sacos', explanation: `Para ${volume}m³ de concreto estrutural convencional Fck=25MPa (7 sacos por m³).` },
        { name: 'Areia Média', quantityNeeded: Number((volume * 0.6).toFixed(1)), unit: 'm³', explanation: 'Areia média lavada para preenchimento de vazios do concreto.' },
        { name: 'Brita nº 1', quantityNeeded: Number((volume * 0.7).toFixed(1)), unit: 'm³', explanation: 'Agregado graúdo estrutural para resistência mecânica.' }
      ];
    } else if (lowerPrompt.includes('parede') || lowerPrompt.includes('alvenaria') || lowerPrompt.includes('tijolo')) {
      const match = lowerPrompt.match(/\d+/);
      const area = match ? Number(match[0]) : 30; // default 30m2
      fallbackResult = [
        { name: 'Tijolo Cerâmico 8 Furos', quantityNeeded: Math.ceil(area * 25), unit: 'unidades', explanation: `Para ${area}m² de alvenaria de vedação de tijolos em pé (média de 25 por m² + quebras).` },
        { name: 'Cimento CP-II', quantityNeeded: Math.ceil(area * 0.12), unit: 'sacos', explanation: 'Argamassa de assentamento.' },
        { name: 'Areia Média', quantityNeeded: Number((area * 0.015).toFixed(2)), unit: 'm³', explanation: 'Areia para mistura da argamassa de assentamento.' }
      ];
    } else if (lowerPrompt.includes('hidráulica') || lowerPrompt.includes('cano') || lowerPrompt.includes('tubo')) {
      fallbackResult = [
        { name: 'Tubo de PVC Marrom 25mm (Água Quente/Fria)', quantityNeeded: 6, unit: 'unidades (6m)', explanation: 'Distribuição hidráulica padrão para banheiros e cozinha.' },
        { name: 'Tubo de PVC Esgoto 100mm', quantityNeeded: 4, unit: 'unidades (6m)', explanation: 'Para coleta sanitária e ramal principal.' },
        { name: 'Adesivo Plástico para PVC', quantityNeeded: 2, unit: 'bisnagas', explanation: 'Solda fria de tubos e conexões.' }
      ];
    } else {
      fallbackResult = [
        { name: 'Cimento CP-II', quantityNeeded: 10, unit: 'sacos', explanation: 'Estimativa base para pequenas reformas.' },
        { name: 'Areia Média', quantityNeeded: 1, unit: 'm³', explanation: 'Agregado básico para massas de assentamento e reboco.' },
        { name: 'Ferramentas de Uso Geral', quantityNeeded: 1, unit: 'kit', explanation: 'Espátulas, colher de pedreiro e desempenadeiras para acabamento.' }
      ];
    }

    res.json({ success: true, materials: fallbackResult, fallbackUsed: true });
  });

  // --- PARAMETERS (ETAPAS DA CONSTRUÇÃO & CRONÔMETROS) ---

  // Listar etapas de uma obra
  app.get('/api/sites/:siteId/parameters', authenticateToken, (req, res) => {
    const { siteId } = req.params;
    const db = readDB();
    const siteParameters = db.parameters.filter(p => p.siteId === siteId);

    // Compute live stopwatch values if they are currently running
    const updatedParameters = siteParameters.map(p => {
      if (p.timerRunning && p.timerStartedAt) {
        const elapsed = Math.floor((Date.now() - p.timerStartedAt) / 1000);
        return {
          ...p,
          timerDuration: p.timerDuration + elapsed
        };
      }
      return p;
    });

    res.json(updatedParameters);
  });

  // Adicionar etapa (Apenas Engenheiros ou Mestres)
  app.post('/api/sites/:siteId/parameters', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'engineer' && req.user.role !== 'master_builder') {
      return res.status(403).json({ error: 'Apenas engenheiros ou mestres de obra podem planejar etapas.' });
    }

    const { siteId } = req.params;
    const { name, deadline, assignedToName } = req.body;

    if (!name || !deadline) {
      return res.status(400).json({ error: 'Nome da etapa e prazo de entrega são obrigatórios.' });
    }

    const db = readDB();
    const newParam: ConstructionParameter = {
      id: crypto.randomUUID(),
      siteId,
      name,
      status: 'pending',
      percentage: 0,
      deadline,
      assignedToName: assignedToName || 'Não atribuído',
      timerDuration: 0,
      timerRunning: false
    };

    db.parameters.push(newParam);
    writeDB(db);
    res.status(201).json(newParam);
  });

  // Atualizar progresso ou cronômetro da etapa
  app.put('/api/sites/:siteId/parameters/:id', authenticateToken, (req: any, res) => {
    if (req.user.role === 'worker') {
      return res.status(403).json({ error: 'Operários comuns não podem alterar etapas.' });
    }

    const { siteId, id } = req.params;
    const { percentage, status, action, assignedToName, deadline, name } = req.body; // action can be 'start_timer' | 'stop_timer' | 'reset_timer'

    const db = readDB();
    const paramIndex = db.parameters.findIndex(p => p.id === id && p.siteId === siteId);

    if (paramIndex === -1) {
      return res.status(404).json({ error: 'Etapa não encontrada.' });
    }

    const param = db.parameters[paramIndex];

    // Update basic fields
    if (percentage !== undefined) {
      param.percentage = Math.max(0, Math.min(100, Number(percentage)));
      if (param.percentage === 100) {
        param.status = 'completed';
      } else if (param.percentage > 0) {
        param.status = 'ongoing';
      } else {
        param.status = 'pending';
      }
    }
    
    if (status !== undefined) {
      param.status = status;
      if (status === 'completed') {
        param.percentage = 100;
        // Stop timer automatically if completed
        if (param.timerRunning && param.timerStartedAt) {
          const elapsed = Math.floor((Date.now() - param.timerStartedAt) / 1000);
          param.timerDuration += elapsed;
          param.timerRunning = false;
          param.timerStartedAt = undefined;
        }
      }
    }

    if (assignedToName !== undefined) param.assignedToName = assignedToName;
    if (deadline !== undefined) param.deadline = deadline;
    if (name !== undefined) param.name = name;

    // Timer controls
    if (action === 'start_timer') {
      if (!param.timerRunning) {
        param.timerRunning = true;
        param.timerStartedAt = Date.now();
        if (param.status === 'pending') {
          param.status = 'ongoing';
        }
      }
    } else if (action === 'stop_timer') {
      if (param.timerRunning && param.timerStartedAt) {
        const elapsed = Math.floor((Date.now() - param.timerStartedAt) / 1000);
        param.timerDuration += elapsed;
        param.timerRunning = false;
        param.timerStartedAt = undefined;
      }
    } else if (action === 'reset_timer') {
      param.timerDuration = 0;
      param.timerRunning = false;
      param.timerStartedAt = undefined;
    }

    // Automatically calculate global construction site progress based on parameter percentages
    const siteParams = db.parameters.filter(p => p.siteId === siteId);
    if (siteParams.length > 0) {
      const sumPercentage = siteParams.reduce((sum, p) => sum + (p.id === id ? param.percentage : p.percentage), 0);
      const averageProgress = Math.round(sumPercentage / siteParams.length);
      const siteIndex = db.sites.findIndex(s => s.id === siteId);
      if (siteIndex !== -1) {
        db.sites[siteIndex].percentage = averageProgress;
        if (averageProgress === 100) {
          db.sites[siteIndex].status = 'completed';
        } else if (averageProgress > 0 && db.sites[siteIndex].status === 'planning') {
          db.sites[siteIndex].status = 'ongoing';
        }
      }
    }

    writeDB(db);
    
    // Return with correctly computed duration
    const responseParam = { ...param };
    if (responseParam.timerRunning && responseParam.timerStartedAt) {
      const elapsed = Math.floor((Date.now() - responseParam.timerStartedAt) / 1000);
      responseParam.timerDuration += elapsed;
    }

    res.json(responseParam);
  });

  // Remover Etapa (Apenas Engenheiros/Mestres)
  app.delete('/api/sites/:siteId/parameters/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'engineer' && req.user.role !== 'master_builder') {
      return res.status(403).json({ error: 'Apenas engenheiros ou mestres de obra podem excluir etapas.' });
    }

    const { siteId, id } = req.params;
    const db = readDB();
    
    db.parameters = db.parameters.filter(p => !(p.id === id && p.siteId === siteId));
    
    // Recalculate construction site progress
    const siteParams = db.parameters.filter(p => p.siteId === siteId);
    const siteIndex = db.sites.findIndex(s => s.id === siteId);
    if (siteIndex !== -1) {
      if (siteParams.length > 0) {
        const sumPercentage = siteParams.reduce((sum, p) => sum + p.percentage, 0);
        db.sites[siteIndex].percentage = Math.round(sumPercentage / siteParams.length);
      } else {
        db.sites[siteIndex].percentage = 0;
      }
    }

    writeDB(db);
    res.json({ success: true });
  });

  // --- TEAM MESSAGES (COMUNICAÇÃO DA EQUIPE) ---

  // Obter mensagens de uma obra
  app.get('/api/sites/:siteId/messages', authenticateToken, (req, res) => {
    const { siteId } = req.params;
    const db = readDB();
    const siteMessages = db.messages.filter(m => m.siteId === siteId);
    res.json(siteMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
  });

  // Enviar mensagem para equipe
  app.post('/api/sites/:siteId/messages', authenticateToken, (req: any, res) => {
    const { siteId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem vazia.' });
    }

    const db = readDB();
    const newMessage: TeamMessage = {
      id: crypto.randomUUID(),
      siteId,
      senderName: req.user.name,
      senderRole: req.user.role,
      message,
      timestamp: new Date().toISOString()
    };

    db.messages.push(newMessage);
    writeDB(db);
    res.status(201).json(newMessage);
  });

  // --- BLUEPRINTS (PROJETOS & DESENHOS) ---

  // Listar desenhos de uma obra
  app.get('/api/sites/:siteId/blueprints', authenticateToken, (req, res) => {
    const { siteId } = req.params;
    const db = readDB();
    const siteBlueprints = db.blueprints.filter(b => b.siteId === siteId);
    res.json(siteBlueprints);
  });

  // Adicionar desenho/projeto (Engenheiro ou Mestre de obras)
  app.post('/api/sites/:siteId/blueprints', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'engineer' && req.user.role !== 'master_builder') {
      return res.status(403).json({ error: 'Apenas engenheiros ou mestres de obra podem anexar projetos.' });
    }

    const { siteId } = req.params;
    const { title, description, fileData } = req.body;

    if (!title || !fileData) {
      return res.status(400).json({ error: 'Título e arquivo do desenho são obrigatórios.' });
    }

    const db = readDB();
    const newBlueprint: Blueprint = {
      id: crypto.randomUUID(),
      siteId,
      title,
      description: description || '',
      fileData,
      uploadedBy: req.user.name,
      uploadedAt: new Date().toISOString()
    };

    db.blueprints.push(newBlueprint);
    writeDB(db);
    res.status(201).json(newBlueprint);
  });

  // Remover desenho/projeto
  app.delete('/api/sites/:siteId/blueprints/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'engineer' && req.user.role !== 'master_builder') {
      return res.status(403).json({ error: 'Apenas engenheiros ou mestres de obra podem excluir desenhos.' });
    }

    const { siteId, id } = req.params;
    const db = readDB();
    db.blueprints = db.blueprints.filter(b => !(b.id === id && b.siteId === siteId));
    writeDB(db);
    res.json({ success: true });
  });

  // --- WORKERS (CADASTRO / INSCRIÇÃO DE TRABALHADORES) ---

  // Listar trabalhadores cadastrados de uma obra
  app.get('/api/sites/:siteId/workers', authenticateToken, (req, res) => {
    const { siteId } = req.params;
    const db = readDB();
    const siteWorkers = db.workers.filter(w => w.siteId === siteId);
    res.json(siteWorkers);
  });

  // Adicionar trabalhador (Apenas engenheiro ou mestre de obras)
  app.post('/api/sites/:siteId/workers', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'engineer' && req.user.role !== 'master_builder') {
      return res.status(403).json({ error: 'Permissão negada. Apenas engenheiros e mestres de obra podem cadastrar novos trabalhadores.' });
    }

    const { siteId } = req.params;
    const { name, role, phone, cpf } = req.body;

    if (!name || !role || !phone || !cpf) {
      return res.status(400).json({ error: 'Nome, função, telefone e CPF são obrigatórios.' });
    }

    const db = readDB();
    
    // Check if employee with same CPF is already registered in this site
    const existing = db.workers.find(w => w.cpf === cpf && w.siteId === siteId);
    if (existing) {
      return res.status(400).json({ error: 'Este funcionário (CPF informado) já está inscrito nesta obra.' });
    }

    const newWorker = {
      id: crypto.randomUUID(),
      siteId,
      name,
      role,
      phone,
      cpf,
      status: 'active' as const,
      registeredBy: req.user.name,
      registeredAt: new Date().toISOString()
    };

    db.workers.push(newWorker);
    writeDB(db);

    res.status(201).json(newWorker);
  });

  // Remover trabalhador cadastrado (Apenas engenheiro ou mestre de obras)
  app.delete('/api/sites/:siteId/workers/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'engineer' && req.user.role !== 'master_builder') {
      return res.status(403).json({ error: 'Permissão negada. Apenas engenheiros e mestres de obra podem remover trabalhadores.' });
    }

    const { siteId, id } = req.params;
    const db = readDB();

    db.workers = db.workers.filter(w => !(w.id === id && w.siteId === siteId));
    writeDB(db);

    res.json({ success: true });
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer();
