import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { Wrench, LayoutDashboard, Users, CarFront, Settings2, ClipboardList, Plus, Search, Pencil, Trash2, X, CheckCircle2, AlertCircle, Gauge, Clock3, CircleDollarSign, RefreshCw } from 'lucide-react';

const sections = [
  { id: 'inicio', label: 'Resumen', icon: LayoutDashboard },
  { id: 'ordenes', label: 'Órdenes de reparación', icon: ClipboardList },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'vehiculos', label: 'Vehículos', icon: CarFront },
  { id: 'servicios', label: 'Servicios', icon: Settings2 },
];

const emptyForms = {
  clientes: { nombre: '', telefono: '', correo: '' },
  vehiculos: { cliente_id: '', placa: '', marca: '', modelo: '', anio: '', color: '' },
  servicios: { nombre: '', descripcion: '', precio: '', duracion_min: 60, activo: 1 },
  ordenes: { vehiculo_id: '', servicio_id: '', fecha: new Date().toISOString().slice(0,10), estado: 'Pendiente', observaciones: '', costo_total: '' },
};
const labels = {
  clientes: { nombre: 'Nombre completo', telefono: 'Teléfono', correo: 'Correo electrónico' },
  vehiculos: { cliente_id: 'Cliente propietario', placa: 'Placa', marca: 'Marca', modelo: 'Modelo', anio: 'Año', color: 'Color' },
  servicios: { nombre: 'Nombre del servicio', descripcion: 'Descripción', precio: 'Precio ($)', duracion_min: 'Duración (minutos)', activo: 'Servicio activo' },
  ordenes: { vehiculo_id: 'Vehículo', servicio_id: 'Servicio', fecha: 'Fecha', estado: 'Estado', observaciones: 'Observaciones', costo_total: 'Costo total ($)' },
};
const titles = { clientes: 'Clientes', vehiculos: 'Vehículos', servicios: 'Servicios', ordenes: 'Órdenes de reparación' };

function money(value) { return `$${Number(value || 0).toFixed(2)}`; }
function dateLabel(value) { return value ? String(value).slice(0,10) : '—'; }

export default function App() {
  const [active, setActive] = useState('inicio');
  const [data, setData] = useState({ clientes: [], vehiculos: [], servicios: [], ordenes: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, v, s, o] = await Promise.all([
        api.get('/clientes'), api.get('/vehiculos'), api.get('/servicios'), api.get('/ordenes')
      ]);
      setData({ clientes: c.data, vehiculos: v.data, servicios: s.data, ordenes: o.data });
      setApiStatus('online');
    } catch (err) {
      setApiStatus('offline');
      setNotice({ type: 'error', text: err.response?.data?.message || 'No se pudo conectar con la API. Comprueba que backend y MySQL estén iniciados.' });
    } finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); }, []);

  const stats = useMemo(() => ({
    clientes: data.clientes.length,
    vehiculos: data.vehiculos.length,
    pendientes: data.ordenes.filter(o => o.estado === 'Pendiente' || o.estado === 'En proceso').length,
    ingresos: data.ordenes.filter(o => o.estado === 'Completada').reduce((sum, o) => sum + Number(o.costo_total || 0), 0)
  }), [data]);

  const showNotice = (type, text) => { setNotice({ type, text }); window.setTimeout(() => setNotice(null), 4200); };
  const openCreate = (section) => { setModal({ section, record: null }); setForm({ ...emptyForms[section] }); };
  const openEdit = (section, record) => {
    const initial = { ...emptyForms[section], ...record };
    Object.keys(initial).forEach(k => { if (initial[k] === null) initial[k] = ''; });
    if (section === 'ordenes') initial.fecha = dateLabel(initial.fecha);
    if (section === 'servicios') initial.activo = String(Number(initial.activo));
    setForm(initial); setModal({ section, record });
  };
  const change = (key, value) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (modal?.section === 'ordenes' && key === 'servicio_id') {
        const service = data.servicios.find(s => String(s.id) === String(value));
        if (service && !modal.record) next.costo_total = service.precio;
      }
      return next;
    });
  };
  const save = async (e) => {
    e.preventDefault();
    if (!modal) return;
    setSaving(true);
    try {
      const section = modal.section;
      const payload = { ...form };
      if (section === 'vehiculos') { payload.cliente_id = Number(payload.cliente_id); payload.anio = payload.anio ? Number(payload.anio) : null; }
      if (section === 'servicios') { payload.precio = Number(payload.precio); payload.duracion_min = Number(payload.duracion_min || 60); payload.activo = Number(payload.activo); }
      if (section === 'ordenes') { payload.vehiculo_id = Number(payload.vehiculo_id); payload.servicio_id = Number(payload.servicio_id); payload.costo_total = Number(payload.costo_total); }
      if (modal.record) await api.put(`/${section}/${modal.record.id}`, payload);
      else await api.post(`/${section}`, payload);
      setModal(null); showNotice('success', `${titles[section]} ${modal.record ? 'actualizado(s)' : 'registrado(s)'} correctamente.`); await loadAll();
    } catch (err) { showNotice('error', err.response?.data?.message || 'No se pudo guardar el registro. Revisa los campos e inténtalo de nuevo.'); }
    finally { setSaving(false); }
  };
  const remove = async (section, row) => {
    if (!window.confirm(`¿Seguro que deseas eliminar este registro de ${titles[section].toLowerCase()}?`)) return;
    try { await api.delete(`/${section}/${row.id}`); showNotice('success', 'Registro eliminado correctamente.'); await loadAll(); }
    catch (err) { showNotice('error', err.response?.data?.message || 'No se pudo eliminar el registro. Puede tener datos relacionados.'); }
  };

  const nav = sections.find(s => s.id === active);
  const rows = (data[active] || []).filter(row => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
  const activeRows = active === 'inicio' ? [] : rows;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Wrench size={22}/></div><div><strong>AutoPro</strong><span>TALLER AUTOMOTRIZ</span></div></div>
      <div className="side-label">MENÚ PRINCIPAL</div>
      <nav>{sections.map(item => <button key={item.id} className={`nav-item ${active === item.id ? 'selected' : ''}`} onClick={() => {setActive(item.id);setSearch('');}}><item.icon size={18}/><span>{item.label}</span>{item.id === 'ordenes' && stats.pendientes > 0 && <b className="nav-count">{stats.pendientes}</b>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="status-dot"/><div><strong>Panel de gestión</strong><span>Control del taller</span></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="crumb">Taller / <b>{nav?.label || 'Resumen'}</b></div><div className="top-right"><span className={`api-pill ${apiStatus}`}><i/> {apiStatus === 'online' ? 'API conectada' : apiStatus === 'offline' ? 'API desconectada' : 'Conectando...'}</span><div className="avatar">AP</div></div></header>
      <div className="content">
        {notice && <div className={`notice ${notice.type}`}><span>{notice.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}</span>{notice.text}<button onClick={() => setNotice(null)} aria-label="Cerrar"><X size={16}/></button></div>}
        {active === 'inicio' ? <Dashboard data={data} stats={stats} loading={loading} setActive={setActive} openCreate={openCreate}/> :
          <section>
            <div className="page-heading"><div><div className="eyebrow">ADMINISTRACIÓN</div><h1>{nav?.label}</h1><p>Administra la información y mantén los registros del taller al día.</p></div><button className="primary-btn" onClick={() => openCreate(active)}><Plus size={18}/> Nuevo registro</button></div>
            <div className="table-card">
              <div className="table-toolbar"><div><strong>{titles[active]}</strong><span>{activeRows.length} registro(s)</span></div><label className="searchbox"><Search size={17}/><input placeholder="Buscar registro..." value={search} onChange={e => setSearch(e.target.value)}/></label><button className="icon-btn" onClick={loadAll} title="Actualizar"><RefreshCw size={17}/></button></div>
              {loading ? <div className="empty-state"><RefreshCw className="spin" size={24}/><p>Cargando datos...</p></div> :
                activeRows.length === 0 ? <div className="empty-state"><ClipboardList size={30}/><strong>No hay registros para mostrar</strong><p>Agrega uno nuevo o prueba con otra búsqueda.</p></div> :
                <div className="table-wrap"><table><thead><tr>{getColumns(active).map(col => <th key={col}>{columnLabel(active,col)}</th>)}<th>ACCIONES</th></tr></thead><tbody>
                  {activeRows.map(row => <tr key={row.id}>{getColumns(active).map(col => <td key={col}>{renderCell(active,col,row)}</td>)}<td><div className="actions"><button className="action-edit" onClick={() => openEdit(active,row)} title="Editar"><Pencil size={15}/></button><button className="action-delete" onClick={() => remove(active,row)} title="Eliminar"><Trash2 size={15}/></button></div></td></tr>)}
                </tbody></table></div>}
            </div>
          </section>}
        <footer>AutoPro <span>•</span> Sistema de gestión de taller automotriz <span>•</span> Proyecto académico Full Stack</footer>
      </div>
    </main>

    {modal && <div className="modal-backdrop" onMouseDown={e => { if(e.target === e.currentTarget) setModal(null); }}><div className="modal">
      <div className="modal-header"><div><div className="eyebrow">{modal.record ? 'EDITAR INFORMACIÓN' : 'NUEVO REGISTRO'}</div><h2>{modal.record ? 'Editar ' : 'Registrar '}{titles[modal.section]}</h2></div><button className="icon-btn" onClick={() => setModal(null)}><X size={19}/></button></div>
      <form onSubmit={save}><div className="form-grid">{Object.entries(labels[modal.section]).map(([key,label]) => <Field key={key} section={modal.section} field={key} label={label} value={form[key] ?? ''} change={change} data={data}/>)}</div>
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setModal(null)}>Cancelar</button><button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Guardando...' : <><CheckCircle2 size={17}/>{modal.record ? 'Guardar cambios' : 'Registrar'}</>}</button></div></form>
    </div></div>}
  </div>;
}

function getColumns(section) {
  return {
    clientes: ['id','nombre','telefono','correo'],
    vehiculos: ['id','placa','marca','modelo','cliente_id','anio'],
    servicios: ['id','nombre','precio','duracion_min','activo'],
    ordenes: ['id','cliente','placa','servicio','fecha','estado','costo_total']
  }[section] || [];
}
function columnLabel(section, col) {
  const names = {id:'ID',nombre:'NOMBRE',telefono:'TELÉFONO',correo:'CORREO',placa:'PLACA',marca:'MARCA',modelo:'MODELO',cliente_id:'CLIENTE',anio:'AÑO',precio:'PRECIO',duracion_min:'DURACIÓN',activo:'ESTADO',cliente:'CLIENTE',servicio:'SERVICIO',fecha:'FECHA',estado:'ESTADO',costo_total:'TOTAL'};
  return names[col] || col.toUpperCase();
}
function renderCell(section, col, row) {
  if (col === 'precio' || col === 'costo_total') return <strong>{money(row[col])}</strong>;
  if (col === 'activo') return <span className={`status-badge ${row.activo ? 'done' : 'cancel'}`}>{row.activo ? 'Activo' : 'Inactivo'}</span>;
  if (col === 'estado') return <span className={`status-badge ${row.estado === 'Completada' ? 'done' : row.estado === 'Cancelada' ? 'cancel' : row.estado === 'En proceso' ? 'progress' : 'pending'}`}>{row.estado}</span>;
  if (col === 'cliente_id' && section === 'vehiculos') return row.cliente_nombre || `ID ${row[col]}`;
  if (col === 'fecha') return dateLabel(row[col]);
  if (col === 'id') return <span className="id-cell">#{String(row.id).padStart(3,'0')}</span>;
  return row[col] || '—';
}
function Field({section,field,label,value,change,data}) {
  const common = { value, onChange: e => change(field,e.target.value), required: !['correo','descripcion','duracion_min','activo','observaciones','anio','color'].includes(field) };
  if (field === 'cliente_id') return <label className="field"><span>{label}</span><select {...common}><option value="">Selecciona un cliente</option>{data.clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} · {c.telefono}</option>)}</select></label>;
  if (field === 'vehiculo_id') return <label className="field"><span>{label}</span><select {...common}><option value="">Selecciona un vehículo</option>{data.vehiculos.map(v => <option key={v.id} value={v.id}>{v.placa} · {v.marca} {v.modelo}</option>)}</select></label>;
  if (field === 'servicio_id') return <label className="field"><span>{label}</span><select {...common}><option value="">Selecciona un servicio</option>{data.servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} · {money(s.precio)}</option>)}</select></label>;
  if (field === 'estado') return <label className="field"><span>{label}</span><select {...common}>{['Pendiente','En proceso','Completada','Cancelada'].map(s => <option key={s}>{s}</option>)}</select></label>;
  if (field === 'activo') return <label className="field"><span>{label}</span><select {...common}><option value="1">Activo</option><option value="0">Inactivo</option></select></label>;
  let type = 'text';
  if (field === 'fecha') type = 'date';
  if (field === 'anio') type = 'number';
  if (field === 'precio' || field === 'costo_total') type = 'number';
  if (field === 'duracion_min') type = 'number';
  if (field === 'correo') type = 'email';
  const numeric = ['anio','precio','costo_total','duracion_min'].includes(field);
  return <label className={`field ${['descripcion','observaciones'].includes(field) ? 'wide' : ''}`}><span>{label}</span>{['descripcion','observaciones'].includes(field) ? <textarea {...common} rows="3" placeholder={label}/> : <input {...common} type={type} min={numeric ? '0' : undefined} step={['precio','costo_total'].includes(field) ? '0.01' : '1'} placeholder={label}/>}</label>;
}

function Dashboard({data,stats,loading,setActive,openCreate}) {
  const recent = [...data.ordenes].slice(0,5);
  return <section>
    <div className="welcome-banner"><div className="welcome-copy"><div className="eyebrow light">CENTRO DE OPERACIONES</div><h1>Todo el taller, bajo control.</h1><p>Administra clientes, vehículos, servicios y reparaciones desde un solo lugar.</p><button className="banner-btn" onClick={() => setActive('ordenes')}>Ver órdenes <span>→</span></button></div><div className="banner-art"><div className="art-ring ring-one"/><div className="art-ring ring-two"/><CarFront size={104} strokeWidth={1.1}/><Wrench className="art-wrench" size={40}/></div></div>
    <div className="page-heading dashboard-title"><div><div className="eyebrow">VISTA GENERAL</div><h2>Resumen del taller</h2><p>Indicadores principales de tu negocio.</p></div><button className="primary-btn" onClick={() => openCreate('ordenes')}><Plus size={18}/> Nueva orden</button></div>
    <div className="stats-grid">
      <Stat icon={Users} label="Clientes registrados" value={stats.clientes} foot="Base de clientes" tone="blue"/>
      <Stat icon={CarFront} label="Vehículos registrados" value={stats.vehiculos} foot="Vehículos en sistema" tone="purple"/>
      <Stat icon={Clock3} label="Órdenes activas" value={stats.pendientes} foot="Pendientes o en proceso" tone="orange"/>
      <Stat icon={CircleDollarSign} label="Servicios completados" value={money(stats.ingresos)} foot="Total de órdenes completadas" tone="green"/>
    </div>
    <div className="dashboard-bottom"><div className="table-card recent-card"><div className="table-toolbar"><div><strong>Órdenes recientes</strong><span>Últimos registros del taller</span></div><button className="text-btn" onClick={() => setActive('ordenes')}>Ver todas →</button></div>
      {loading ? <div className="empty-state">Cargando órdenes...</div> : recent.length === 0 ? <div className="empty-state"><ClipboardList size={28}/><p>Aún no hay órdenes registradas.</p><button className="text-btn" onClick={() => openCreate('ordenes')}>Crear primera orden →</button></div> :
      <div className="table-wrap"><table><thead><tr><th>VEHÍCULO</th><th>CLIENTE</th><th>SERVICIO</th><th>ESTADO</th><th>TOTAL</th></tr></thead><tbody>{recent.map(o=><tr key={o.id}><td><strong>{o.placa}</strong><small className="subcell">{o.marca} {o.modelo}</small></td><td>{o.cliente}</td><td>{o.servicio}</td><td><span className={`status-badge ${o.estado === 'Completada' ? 'done' : o.estado === 'Cancelada' ? 'cancel' : o.estado === 'En proceso' ? 'progress' : 'pending'}`}>{o.estado}</span></td><td><strong>{money(o.costo_total)}</strong></td></tr>)}</tbody></table></div>}
    </div><div className="quick-card"><div className="quick-icon"><Gauge size={23}/></div><h3>Accesos rápidos</h3><p>Agrega información al sistema sin perder tiempo.</p><button onClick={() => openCreate('clientes')}><Plus size={16}/> Nuevo cliente</button><button onClick={() => openCreate('vehiculos')}><Plus size={16}/> Registrar vehículo</button><button onClick={() => openCreate('servicios')}><Plus size={16}/> Añadir servicio</button><button onClick={() => openCreate('ordenes')}><Plus size={16}/> Crear orden</button></div></div>
  </section>;
}
function Stat({icon:Icon,label,value,foot,tone}) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={21}/></div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-foot">{foot}</span></div>;
}
