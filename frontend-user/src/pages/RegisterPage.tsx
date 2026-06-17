import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GRADE_STAGE_LABELS, type GradeStage } from '@oisee/shared';
import { authApi, type RegisterPayload } from '@/api/auth';
import { PRESET_AVATARS } from '@/utils/avatars';
import { AuthLayout, fieldStyle, labelStyle } from './auth-shared';

type Mode = 'account' | 'wechat';

export function RegisterPage() {
  const nav = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<Mode>('account');

  // 第一步
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [avatar, setAvatar] = useState(PRESET_AVATARS[0]!.key);
  // 微信预填
  const [wechat, setWechat] = useState<{ openId: string; nickname: string; phone: string } | null>(null);
  const [scanning, setScanning] = useState(false);

  // 第二步
  const [age, setAge] = useState('');
  const [learningStage, setLearningStage] = useState('');
  const [gradeStage, setGradeStage] = useState<GradeStage | null>(null);
  const [classifying, setClassifying] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleWechatScan() {
    setError(null);
    setScanning(true);
    try {
      const p = await authApi.wechatMockScan();
      setWechat({ openId: p.openId, nickname: p.nickname, phone: p.phone });
      setAvatar(p.avatar);
    } catch (err: any) {
      setError(err?.message ?? '扫码失败');
    } finally {
      setScanning(false);
    }
  }

  function validateStep1(): string | null {
    if (mode === 'account') {
      if (username.trim().length < 2) return '用户名至少 2 个字符';
      if (password.length < 6) return '密码至少 6 个字符';
      if (password !== confirm) return '两次输入的密码不一致';
    } else {
      if (!wechat) return '请先完成微信扫码获取信息';
    }
    return null;
  }

  function goStep2() {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError(null);
    setStep(2);
  }

  async function handleClassify() {
    const a = Number(age);
    if (!a || a < 1) { setError('请输入有效的年龄'); return; }
    setError(null);
    setClassifying(true);
    try {
      const res = await authApi.classifyGrade(a, learningStage.trim() || undefined);
      setGradeStage(res.gradeStage as GradeStage);
    } catch (err: any) {
      setError(err?.message ?? '年级阶段定位失败');
    } finally {
      setClassifying(false);
    }
  }

  async function handleSubmit() {
    const a = Number(age);
    if (!a || a < 1) { setError('请输入有效的年龄'); return; }
    setError(null);
    setSubmitting(true);
    try {
      // 提交前若还没定位过，先定位一次
      let grade = gradeStage;
      if (!grade) {
        const res = await authApi.classifyGrade(a, learningStage.trim() || undefined);
        grade = res.gradeStage as GradeStage;
        setGradeStage(grade);
      }
      const payload: RegisterPayload = {
        nickname: mode === 'account' ? username.trim() : (wechat?.nickname ?? '科学探索者'),
        avatar,
        age: a,
        learningStage: learningStage.trim() || undefined,
        gradeStage: grade ?? undefined,
      };
      if (mode === 'account') {
        payload.username = username.trim();
        payload.password = password;
      } else if (wechat) {
        payload.wechatOpenId = wechat.openId;
        payload.phone = wechat.phone;
      }
      await authApi.register(payload);
      // 需求：注册成功 → 跳登录页
      nav('/login', { replace: true, state: { justRegistered: true } });
    } catch (err: any) {
      setError(err?.message ?? '注册失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title={step === 1 ? '创建账号' : '完善学习信息'} subtitle={step === 1 ? '加入 OISee，开启你的科学之旅' : '帮我们为你匹配合适的内容难度'}>
      {/* 步骤指示 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        <StepDot n={1} active={step === 1} done={step > 1} label="基础信息" />
        <StepDot n={2} active={step === 2} done={false} label="学习画像" />
      </div>

      {step === 1 ? (
        <>
          <div style={{ display: 'flex', gap: 4, border: '1px solid var(--hairline)', borderRadius: 999, padding: 4, marginBottom: 24 }}>
            <TabBtn active={mode === 'account'} onClick={() => setMode('account')}>账号密码</TabBtn>
            <TabBtn active={mode === 'wechat'} onClick={() => setMode('wechat')}>微信扫码</TabBtn>
          </div>

          {mode === 'account' ? (
            <>
              <label style={labelStyle}>用户名</label>
              <input style={fieldStyle} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="2-40 个字符" autoFocus />
              <label style={{ ...labelStyle, marginTop: 18 }}>密码</label>
              <input style={fieldStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" />
              <label style={{ ...labelStyle, marginTop: 18 }}>确认密码</label>
              <input style={fieldStyle} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="再次输入密码" />
            </>
          ) : (
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              {wechat ? (
                <div style={{ padding: 18, border: '1px solid var(--hairline)', borderRadius: 10, background: 'var(--bg-2)' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>✓ 已获取微信信息</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 8 }}>昵称：{wechat.nickname}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>手机号：{wechat.phone}</div>
                  <button className="btn ghost sm" onClick={handleWechatScan} disabled={scanning} style={{ marginTop: 12 }}>重新扫码</button>
                </div>
              ) : (
                <>
                  <div style={{ width: 160, height: 160, margin: '0 auto', borderRadius: 12, border: '1px solid var(--hairline)', background: 'var(--bg-2)', display: 'grid', placeItems: 'center', fontSize: 64, opacity: 0.85 }}>▦</div>
                  <p style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 12 }}>扫码获取头像、名称、手机号（演示为模拟）</p>
                  <button className="btn amber" onClick={handleWechatScan} disabled={scanning} style={{ marginTop: 8 }}>{scanning ? '扫码中…' : '模拟扫码获取信息'}</button>
                </>
              )}
            </div>
          )}

          {/* 头像选择 */}
          <label style={{ ...labelStyle, marginTop: 22 }}>选择头像</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {PRESET_AVATARS.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setAvatar(a.key)}
                title={a.key}
                style={{
                  width: 48, height: 48, borderRadius: 999, fontSize: 24,
                  display: 'grid', placeItems: 'center', cursor: 'pointer',
                  background: a.bg, color: '#fff',
                  border: avatar === a.key ? '3px solid var(--ink)' : '3px solid transparent',
                  outline: avatar === a.key ? '2px solid var(--amber)' : 'none',
                  transition: 'transform .1s',
                }}
              >
                {a.emoji}
              </button>
            ))}
          </div>

          {error && <div style={errStyle}>{error}</div>}
          <button className="btn primary lg" onClick={goStep2} style={{ width: '100%', marginTop: 24, justifyContent: 'center' }}>下一步</button>
        </>
      ) : (
        <>
          <label style={labelStyle}>年龄</label>
          <input style={fieldStyle} type="number" min={1} max={120} value={age} onChange={(e) => { setAge(e.target.value); setGradeStage(null); }} placeholder="请输入学员年龄" autoFocus />

          <label style={{ ...labelStyle, marginTop: 18 }}>学习阶段（选填）</label>
          <input style={fieldStyle} value={learningStage} onChange={(e) => { setLearningStage(e.target.value); setGradeStage(null); }} placeholder="如：三年级 / 初二 / 学龄前" />

          <button className="btn ghost sm" onClick={handleClassify} disabled={classifying || !age} style={{ marginTop: 16 }}>
            {classifying ? '智能定位中…' : '🧠 智能定位年级阶段'}
          </button>

          {gradeStage && (
            <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 10, background: 'rgba(74,134,98,0.08)', border: '1px solid rgba(74,134,98,0.3)' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>思考模型判定的年级阶段</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>{GRADE_STAGE_LABELS[gradeStage]}</div>
            </div>
          )}

          {error && <div style={errStyle}>{error}</div>}
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button className="btn ghost lg" onClick={() => { setStep(1); setError(null); }} style={{ flex: '0 0 auto', justifyContent: 'center' }}>上一步</button>
            <button className="btn primary lg" onClick={handleSubmit} disabled={submitting} style={{ flex: 1, justifyContent: 'center' }}>
              {submitting ? '提交中…' : '完成注册'}
            </button>
          </div>
        </>
      )}

      <div style={{ marginTop: 28, textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
        已有账号？<Link to="/login" style={{ color: 'var(--amber)', fontWeight: 600 }}>去登录</Link>
      </div>
    </AuthLayout>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        flex: 1, padding: '8px 0', borderRadius: 999, fontSize: 13, fontWeight: 600,
        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'var(--paper)' : 'var(--ink-2)',
        transition: 'background .15s',
      }}
    >
      {children}
    </button>
  );
}

function StepDot({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  const on = active || done;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
      <span style={{
        width: 24, height: 24, borderRadius: 999, display: 'grid', placeItems: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0,
        background: on ? 'var(--ink)' : 'var(--bg-2)', color: on ? '#fff' : 'var(--ink-3)',
      }}>{done ? '✓' : n}</span>
      <span style={{ fontSize: 13, color: active ? 'var(--ink)' : 'var(--ink-3)', fontWeight: active ? 600 : 400 }}>{label}</span>
    </div>
  );
}

const errStyle: React.CSSProperties = {
  marginTop: 16, padding: '10px 14px', borderRadius: 8,
  background: 'rgba(201,87,70,0.08)', border: '1px solid rgba(201,87,70,0.3)',
  color: 'var(--coral)', fontSize: 13,
};
