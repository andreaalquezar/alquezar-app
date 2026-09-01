import React, { useState, useEffect } from "react";
import {
  Plus, X, Play, Pause, Trash2,
  Circle, CheckCircle2, Lock, LogOut
} from "lucide-react";
import { auth, db } from "./firebaseConfig";
import { 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc,
  onSnapshot
} from "firebase/firestore";

const STAGES = [
  { id: "briefing", label: "Briefing" },
  { id: "levantamento", label: "Levantamento" },
  { id: "estudo", label: "Estudo Preliminar" },
  { id: "desenvolvimento", label: "Desenvolvimento" },
  { id: "especificacao", label: "Especificação" },
  { id: "aprovacao", label: "Aprovação" },
  { id: "executivo", label: "Executivo" },
  { id: "obra", label: "Obra" },
  { id: "entrega", label: "Entrega" },
];

const TIPOLOGIAS = ["Residencial", "Comercial", "Paisagismo", "Iluminação", "Consultoria"];

const todayISO = () => new Date().toISOString().slice(0, 10);

const Btn = ({ children, onClick, variant = "primary", disabled = false, style }) => {
  const variants = {
    primary: { bg: "#4D4D4D", fg: "#F5F1E8" },
    gold: { bg: "#A6935F", fg: "#2E2C2A" },
  };
  const v = variants[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "9px 16px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        background: v.bg,
        color: v.fg,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        border: "none",
        ...style
      }}
    >
      {children}
    </button>
  );
};

const Card = ({ children, style }) => (
  <div style={{ background: "#FBF8F2", border: "1px solid #DAD3C4", borderRadius: 12, ...style }}>
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12.5 }}>
    <span style={{ fontSize: 10.5, color: "#7A756B", textTransform: "uppercase" }}>{label}</span>
    {children}
  </label>
);

const inputStyle = {
  padding: "8px 10px",
  borderRadius: 7,
  border: "1px solid #DAD3C4",
  background: "#fff",
  fontSize: 13.5,
  outline: "none",
};

const Modal = ({ title, onClose, children }) => (
  <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#2E2C2Aaa", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
    <div onClick={(e) => e.stopPropagation()} style={{ background: "#FBF8F2", borderRadius: 14, width: 480, maxWidth: "100%", maxHeight: "88vh", overflowY: "auto", border: "1px solid #DAD3C4", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#7A756B", cursor: "pointer" }}>
          <X size={18} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

function TelaLogin({ onLogin }) {
  const [email, setEmail] = useState("andrea@alquezar.co");
  const [senha, setSenha] = useState("alquezar");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const entrar = async () => {
    setCarregando(true);
    setErro("");
    try {
      await signInWithEmailAndPassword(auth, email, senha);
    } catch (error) {
      setErro("E-mail ou senha incorretos");
    }
    setCarregando(false);
  };

  return (
    <div style={{ background: "#4D4D4D", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", padding: 20 }}>
      <Card style={{ padding: "36px 32px", width: 380, maxWidth: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>🏗️ Alquezar</div>
          <div style={{ fontSize: 12, color: "#A6935F", textTransform: "uppercase" }}>Gestão de Projetos</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="E-mail">
            <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} autoFocus disabled={carregando} />
          </Field>
          <Field label="Senha">
            <input type="password" style={inputStyle} value={senha} onChange={(e) => setSenha(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} disabled={carregando} />
          </Field>
          {erro && <div style={{ color: "#A66B49", fontSize: 12 }}>{erro}</div>}
          <Btn onClick={entrar} variant="gold" disabled={carregando} style={{ justifyContent: "center", marginTop: 6 }}>
            <Lock size={14} /> {carregando ? "Entrando..." : "Entrar"}
          </Btn>
        </div>
      </Card>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [tab, setTab] = useState("painel");
  const [clientes, setClientes] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [runningTimer, setRunningTimer] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCarregando(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsub1 = onSnapshot(collection(db, "clientes"), (snap) => {
      setClientes(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsub2 = onSnapshot(collection(db, "projetos"), (snap) => {
      setProjetos(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsub3 = onSnapshot(collection(db, "tarefas"), (snap) => {
      setTarefas(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [user]);

  const logout = async () => {
    await signOut(auth);
  };

  if (carregando) {
    return (
      <div style={{ background: "#F5F1E8", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
        ⏳ Carregando...
      </div>
    );
  }

  if (!user) {
    return <TelaLogin onLogin={setUser} />;
  }

  const adicionarCliente = async (cliente) => {
    try {
      await addDoc(collection(db, "clientes"), cliente);
    } catch (error) {
      alert("Erro ao adicionar cliente");
    }
  };

  const removerCliente = async (id) => {
    try {
      await deleteDoc(doc(db, "clientes", id));
    } catch (error) {
      alert("Erro ao remover cliente");
    }
  };

  const adicionarProjeto = async (projeto) => {
    try {
      await addDoc(collection(db, "projetos"), projeto);
    } catch (error) {
      alert("Erro ao adicionar projeto");
    }
  };

  const atualizarProjetoEtapa = async (id, etapa) => {
    try {
      await updateDoc(doc(db, "projetos", id), { etapa });
    } catch (error) {
      alert("Erro ao atualizar projeto");
    }
  };

  const removerProjeto = async (id) => {
    try {
      await deleteDoc(doc(db, "projetos", id));
    } catch (error) {
      alert("Erro ao remover projeto");
    }
  };

  const adicionarTarefa = async (tarefa) => {
    try {
      await addDoc(collection(db, "tarefas"), tarefa);
    } catch (error) {
      alert("Erro ao adicionar tarefa");
    }
  };

  const atualizarTarefa = async (id, dados) => {
    try {
      await updateDoc(doc(db, "tarefas", id), dados);
    } catch (error) {
      alert("Erro ao atualizar tarefa");
    }
  };

  const removerTarefa = async (id) => {
    try {
      await deleteDoc(doc(db, "tarefas", id));
    } catch (error) {
      alert("Erro ao remover tarefa");
    }
  };

  const NAV = [
    { id: "painel", label: "📊 Painel" },
    { id: "clientes", label: "👥 Clientes" },
    { id: "projetos", label: "🌱 Projetos" },
    { id: "tarefas", label: "✓ Tarefas" },
  ];

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F5F1E8", minHeight: "100vh", color: "#3A3836", display: "flex" }}>
      <div style={{ width: 220, background: "#4D4D4D", color: "#F5F1E8", display: "flex", flexDirection: "column", flexShrink: 0, padding: "20px 16px" }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>🏗️ Alquezar</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                background: tab === n.id ? "#A6935F" : "transparent",
                border: "none",
                color: tab === n.id ? "#2E2C2A" : "#D8D2C6",
                fontSize: 13,
                fontWeight: tab === n.id ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#C2B59B", paddingTop: 14, borderTop: "1px solid #615F5C" }}>
          <span>{user.email.split("@")[0]}</span>
          <button onClick={logout} style={{ background: "none", border: "none", color: "#C2B59B", cursor: "pointer" }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: "30px 40px", overflowY: "auto" }}>
        {tab === "painel" && <Painel clientes={clientes} projetos={projetos} tarefas={tarefas} />}
        {tab === "clientes" && <Clientes clientes={clientes} adicionarCliente={adicionarCliente} removerCliente={removerCliente} />}
        {tab === "projetos" && <Projetos projetos={projetos} adicionarProjeto={adicionarProjeto} atualizarProjetoEtapa={atualizarProjetoEtapa} removerProjeto={removerProjeto} clientes={clientes} />}
        {tab === "tarefas" && <Tarefas tarefas={tarefas} adicionarTarefa={adicionarTarefa} atualizarTarefa={atualizarTarefa} removerTarefa={removerTarefa} projetos={projetos} runningTimer={runningTimer} setRunningTimer={setRunningTimer} />}
      </div>
    </div>
  );
}

function Painel({ clientes, projetos, tarefas }) {
  const ativos = projetos.filter((p) => p.etapa !== "entrega").length;

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 20 }}>📊 Painel</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <Card style={{ padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#918D86", marginBottom: 8 }}>Projetos Ativos</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: "#A6935F" }}>{ativos}</div>
        </Card>
        <Card style={{ padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#918D86", marginBottom: 8 }}>Clientes</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: "#A6935F" }}>{clientes.length}</div>
        </Card>
        <Card style={{ padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#918D86", marginBottom: 8 }}>Tarefas em Aberto</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: "#A6935F" }}>{tarefas.filter((t) => !t.feita).length}</div>
        </Card>
        <Card style={{ padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#918D86", marginBottom: 8 }}>Total de Tarefas</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: "#A6935F" }}>{tarefas.length}</div>
        </Card>
      </div>
    </div>
  );
}

function Clientes({ clientes, adicionarCliente, removerCliente }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", endereco: "" });

  const add = async () => {
    if (!form.nome.trim()) return;
    await adicionarCliente({ ...form, criadoEm: todayISO() });
    setForm({ nome: "", email: "", telefone: "", endereco: "" });
    setOpen(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600 }}>👥 Clientes</h1>
        <Btn onClick={() => setOpen(true)} variant="gold">
          <Plus size={15} /> Novo Cliente
        </Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {clientes.length === 0 ? (
          <Card style={{ padding: 40, textAlign: "center", gridColumn: "1/-1" }}>
            <div style={{ color: "#918D86" }}>Nenhum cliente cadastrado</div>
          </Card>
        ) : (
          clientes.map((c) => (
            <Card key={c.id} style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{c.nome}</div>
                <button onClick={() => removerCliente(c.id)} style={{ background: "none", border: "none", color: "#C2B59B", cursor: "pointer" }}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div style={{ fontSize: 12.5, color: "#7A756B", marginTop: 8 }}>
                {c.telefone && <div>📱 {c.telefone}</div>}
                {c.email && <div>📧 {c.email}</div>}
                {c.endereco && <div>📍 {c.endereco}</div>}
              </div>
            </Card>
          ))
        )}
      </div>

      {open && (
        <Modal title="Novo Cliente" onClose={() => setOpen(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Nome">
              <input style={inputStyle} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} autoFocus />
            </Field>
            <Field label="Telefone">
              <input style={inputStyle} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </Field>
            <Field label="E-mail">
              <input type="email" style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Endereço">
              <input style={inputStyle} value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </Field>
            <Btn onClick={add} variant="gold" style={{ justifyContent: "center", marginTop: 8 }}>
              Salvar
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Projetos({ projetos, adicionarProjeto, atualizarProjetoEtapa, removerProjeto, clientes }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", clienteId: "", tipo: "Residencial" });

  const add = async () => {
    if (!form.nome.trim()) return;
    await adicionarProjeto({ ...form, etapa: "briefing", criadoEm: todayISO() });
    setForm({ nome: "", clienteId: "", tipo: "Residencial" });
    setOpen(false);
  };

  const mover = async (id, dir) => {
    const projeto = projetos.find((p) => p.id === id);
    const idx = STAGES.findIndex((s) => s.id === projeto.etapa);
    const next = Math.min(STAGES.length - 1, Math.max(0, idx + dir));
    await atualizarProjetoEtapa(id, STAGES[next].id);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600 }}>🌱 Projetos</h1>
        <Btn onClick={() => setOpen(true)} variant="gold">
          <Plus size={15} /> Novo Projeto
        </Btn>
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12 }}>
        {STAGES.map((s) => {
          const items = projetos.filter((p) => p.etapa === s.id);
          return (
            <div key={s.id} style={{ minWidth: 220, flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: "#7A756B", textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>
                {s.label} ({items.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((p) => (
                  <Card key={p.id} style={{ padding: 12 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.nome}</div>
                    <div style={{ fontSize: 11, color: "#918D86", marginTop: 4 }}>{p.tipo}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                      <button onClick={() => mover(p.id, -1)} style={{ background: "none", border: "none", color: "#A6935F", cursor: "pointer" }}>◂</button>
                      <button onClick={() => removerProjeto(p.id)} style={{ background: "none", border: "none", color: "#A66B49", cursor: "pointer" }}>
                        <Trash2 size={14} />
                      </button>
                      <button onClick={() => mover(p.id, 1)} style={{ background: "none", border: "none", color: "#A6935F", cursor: "pointer" }}>▸</button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <Modal title="Novo Projeto" onClose={() => setOpen(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Nome">
              <input style={inputStyle} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} autoFocus />
            </Field>
            <Field label="Tipo">
              <select style={inputStyle} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {TIPOLOGIAS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Btn onClick={add} variant="gold" style={{ justifyContent: "center", marginTop: 8 }}>
              Criar Projeto
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Tarefas({ tarefas, adicionarTarefa, atualizarTarefa, removerTarefa, projetos, runningTimer, setRunningTimer }) {
  const [form, setForm] = useState({ titulo: "", projetoId: "" });

  useEffect(() => {
    if (!runningTimer) return;
    const interval = setInterval(() => {}, 1000);
    return () => clearInterval(interval);
  }, [runningTimer]);

  const add = async () => {
    if (!form.titulo.trim()) return;
    await adicionarTarefa({ ...form, feita: false, minutos: 0 });
    setForm({ titulo: "", projetoId: "" });
  };

  const toggle = async (id, feita) => {
    await atualizarTarefa(id, { feita: !feita });
  };

  const toggleTimer = async (id, minutos) => {
    if (runningTimer && runningTimer.tarefaId === id) {
      const elapsedSec = Math.round((Date.now() - runningTimer.startedAt) / 1000);
      await atualizarTarefa(id, { minutos: (minutos || 0) + Math.round(elapsedSec / 60) });
      setRunningTimer(null);
    } else {
      setRunningTimer({ tarefaId: id, startedAt: Date.now() });
    }
  };

  const fmt = (sec) => `${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  
  const liveSeconds = (t) => {
    let base = (t.minutos || 0) * 60;
    if (runningTimer && runningTimer.tarefaId === t.id) base += Math.round((Date.now() - runningTimer.startedAt) / 1000);
    return base;
  };

  const abertas = tarefas.filter((t) => !t.feita);
  const feitas = tarefas.filter((t) => t.feita);

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 20 }}>✓ Tarefas & Tempo</h1>
      <Card style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 10, alignItems: "end" }}>
          <Field label="Nova Tarefa">
            <input style={inputStyle} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Descrever tarefa..." />
          </Field>
          <Field label="Projeto">
            <select style={inputStyle} value={form.projetoId} onChange={(e) => setForm({ ...form, projetoId: e.target.value })}>
              <option value="">Geral</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </Field>
          <Btn onClick={add} variant="gold">
            <Plus size={15} />
          </Btn>
        </div>
      </Card>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Em Aberto ({abertas.length})</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {abertas.length === 0 ? (
          <Card style={{ padding: 40, textAlign: "center" }}>
            <div style={{ color: "#918D86" }}>Tudo em dia! 🎉</div>
          </Card>
        ) : (
          abertas.map((t) => {
            const running = runningTimer && runningTimer.tarefaId === t.id;
            return (
              <Card key={t.id} style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => toggle(t.id, t.feita)} style={{ background: "none", border: "none", color: "#A6935F", cursor: "pointer" }}>
                  <Circle size={17} />
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5 }}>{t.titulo}</div>
                  <div style={{ fontSize: 11, color: "#918D86" }}>{projetos.find((p) => p.id === t.projetoId)?.nome || "Geral"}</div>
                </div>
                <div style={{ fontSize: 12, color: running ? "#A6935F" : "#918D86", minWidth: 60, textAlign: "right" }}>{fmt(liveSeconds(t))}</div>
                <button onClick={() => toggleTimer(t.id, t.minutos)} style={{ background: running ? "#A6935F" : "#F5F1E8", border: "none", color: running ? "#2E2C2A" : "#3A3836", borderRadius: 7, padding: 7, cursor: "pointer" }}>
                  {running ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button onClick={() => removerTarefa(t.id)} style={{ background: "none", border: "none", color: "#C2B59B", cursor: "pointer" }}>
                  <Trash2 size={14} />
                </button>
              </Card>
            );
          })
        )}
      </div>

      {feitas.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Concluídas ({feitas.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {feitas.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", opacity: 0.55 }}>
                <button onClick={() => toggle(t.id, t.feita)} style={{ background: "none", border: "none", color: "#A6935F", cursor: "pointer" }}>
                  <CheckCircle2 size={16} />
                </button>
                <div style={{ fontSize: 13, textDecoration: "line-through" }}>{t.titulo}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
