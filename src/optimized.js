// 经典扫雷游戏 - 优化版本
// 基于 simple.js 的简洁性，整合 index.js 的有用功能

// 排行榜API处理 - 参考simple.js的简洁设计
async function handleLeaderboardAPI(request, env, url) {
  const difficulty = url.pathname.split('/').pop();
  
  // 验证难度参数
  if (!['beginner', 'intermediate', 'expert'].includes(difficulty)) {
    return new Response(JSON.stringify({ success: false, error: '无效的难度级别' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  if (request.method === 'GET') {
    try {
      const data = await env.LEADERBOARD.get('leaderboard:' + difficulty);
      const leaderboard = data ? JSON.parse(data) : [];
      return new Response(JSON.stringify({ success: true, data: leaderboard }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ success: false, error: '服务器错误' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }
  
  if (request.method === 'POST') {
    try {
      const { username, time } = await request.json();
      
      // 基本验证 - 支持8个汉字或16个字符
      const usernameLength = [...username].length; // 正确计算Unicode字符长度
      if (!username || !time || usernameLength > 16 || time < 1 || time > 9999) {
        return new Response(JSON.stringify({ success: false, error: '数据无效' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      
      const data = await env.LEADERBOARD.get('leaderboard:' + difficulty);
      const leaderboard = data ? JSON.parse(data) : [];
      
      // 移除同用户的旧记录，添加新记录
      const filtered = leaderboard.filter(record => record.username !== username.trim());
      // 限制用户名为16个字符（支持8个汉字）
      const trimmedUsername = [...username.trim()].slice(0, 16).join('');
      filtered.push({
        username: trimmedUsername,
        time: parseInt(time),
        date: new Date().toISOString()
      });

      // 排序并保留前20名
      filtered.sort((a, b) => a.time - b.time);
      const top20 = filtered.slice(0, 20);

      await env.LEADERBOARD.put('leaderboard:' + difficulty, JSON.stringify(top20));

      return new Response(JSON.stringify({ success: true, data: top20 }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ success: false, error: '服务器错误' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }

  // CORS预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
  
  return new Response('Method not allowed', { status: 405 });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/leaderboard/')) {
      return handleLeaderboardAPI(request, env, url);
    }

    if (url.pathname === '/') {
      return new Response(getGameHTML(), {
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

function getGameHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>经典扫雷 - Classic Minesweeper</title>
    <style>
        :root {
            --cell-size: 30px;
            --counter-font-size: 24px;
            --smiley-size: 40px;

            /* 深色主题色彩系统 */
            --primary-color: #3b82f6;
            --primary-hover: #2563eb;
            --success-color: #10b981;
            --danger-color: #ef4444;
            --warning-color: #f59e0b;

            /* 背景和面板 */
            --bg-dark: #1e293b;
            --bg-darker: #0f172a;
            --panel-bg: rgba(30, 41, 59, 0.9);
            --panel-bg-light: rgba(51, 65, 85, 0.8);

            /* 文字颜色 */
            --text-primary: #f1f5f9;
            --text-secondary: #cbd5e1;
            --text-muted: #94a3b8;

            /* 阴影系统 */
            --shadow-light: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
            --shadow-medium: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
            --shadow-heavy: 0 20px 25px -5px rgba(0, 0, 0, 0.5);

            /* 边框和圆角 */
            --border-radius: 12px;
            --border-radius-small: 8px;
            --border-color: rgba(148, 163, 184, 0.2);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            /* 全局禁用右键菜单和文本选择 */
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -khtml-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }

        body {
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
            background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%);
            min-height: 100vh;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            margin: 0;
            padding: 0;
            position: relative;
            overflow-x: hidden;
            /* 禁用右键菜单的CSS方式 */
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
        }

        /* 深色主题背景装饰 */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background:
                radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.1) 0%, transparent 50%);
            pointer-events: none;
            z-index: -1;
        }

        .main-container {
            display: flex;
            min-height: 100vh;
            position: relative;
        }

        .game-container {
            position: absolute;
            left: calc(280px + (100vw - 280px) / 2);
            top: max(35%, 120px);
            transform: translate(-50%, -50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }

        .game-content {
            background: rgba(30, 41, 59, 0.9);
            backdrop-filter: blur(20px);
            border-radius: var(--border-radius);
            padding: 20px;
            border: 1px solid rgba(148, 163, 184, 0.2);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
        }

        .game-content:hover {
            transform: translateY(-4px);
            box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.4);
        }

        /* 右侧控制面板 - 紧贴扫雷区右边 */
        .right-panel {
            position: absolute;
            left: calc(280px + (100vw - 280px) / 2 + 20px);
            top: 35%;
            transform: translateY(-50%);
            background: rgba(30, 41, 59, 0.9);
            backdrop-filter: blur(20px);
            border-radius: var(--border-radius);
            padding: 16px;
            border: 1px solid rgba(148, 163, 184, 0.2);
            box-shadow: var(--shadow-heavy);
            z-index: 100;
        }
        .difficulty-selector {
            display: flex;
            flex-direction: column;
            gap: 16px;
            align-items: center;
        }

        .difficulty-buttons {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
        }

        .difficulty-button {
            background: linear-gradient(145deg, #475569, #334155);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-small);
            padding: 12px 18px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            min-width: 80px;
            color: var(--text-primary);
            transition: all 0.2s ease;
            box-shadow: var(--shadow-light);
        }

        .difficulty-button:hover {
            background: linear-gradient(145deg, #64748b, #475569);
            transform: translateY(-2px);
            box-shadow: var(--shadow-medium);
        }

        .difficulty-button:active {
            transform: translateY(0);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .difficulty-button.active {
            background: linear-gradient(145deg, var(--primary-color), var(--primary-hover));
            color: white;
            box-shadow: var(--shadow-medium);
            border-color: var(--primary-color);
        }

        .help-button {
            background: linear-gradient(145deg, var(--warning-color), #d97706);
            border: 1px solid var(--warning-color);
            border-radius: var(--border-radius-small);
            padding: 12px 18px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            color: white;
            transition: all 0.2s ease;
            box-shadow: var(--shadow-light);
        }

        .help-button:hover {
            background: linear-gradient(145deg, #d97706, #b45309);
            transform: translateY(-2px);
            box-shadow: var(--shadow-medium);
        }

        .help-button:active {
            transform: translateY(0);
        }
        .game-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(145deg, #334155, #1e293b);
            border-radius: var(--border-radius-small);
            padding: 12px 20px;
            margin-bottom: 16px;
            width: 100%;
            box-shadow: var(--shadow-medium);
            border: 1px solid var(--border-color);
        }

        .counter {
            background: linear-gradient(145deg, #0f172a, #1e293b);
            color: var(--danger-color);
            font-family: 'JetBrains Mono', 'Courier New', monospace;
            font-size: var(--counter-font-size);
            font-weight: bold;
            padding: 6px 12px;
            border-radius: var(--border-radius-small);
            min-width: calc(var(--counter-font-size) * 2.5);
            text-align: center;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4);
            border: 1px solid #475569;
            text-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
        }

        .smiley-button {
            width: var(--smiley-size);
            height: var(--smiley-size);
            font-size: calc(var(--smiley-size) * 0.7);
            background: linear-gradient(145deg, var(--warning-color), #d97706);
            border: 2px solid var(--warning-color);
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            box-shadow: var(--shadow-medium);
            position: relative;
        }

        .smiley-button:hover {
            transform: scale(1.08);
            box-shadow: 0 8px 25px rgba(245, 158, 11, 0.5);
        }

        .smiley-button:active {
            transform: scale(0.92);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        .game-board {
            background: linear-gradient(145deg, #0f172a, #1e293b);
            border-radius: var(--border-radius);
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            box-shadow: inset 0 4px 8px rgba(0, 0, 0, 0.4);
            border: 1px solid var(--border-color);
        }

        .board-grid {
            display: grid;
            gap: 3px;
            background: linear-gradient(145deg, #334155, #475569);
            padding: 8px;
            border-radius: var(--border-radius-small);
            box-shadow: var(--shadow-medium);
            border: 1px solid rgba(71, 85, 105, 0.5);
        }

        /* 未挖掘格子 - 更亮的金属质感 */
        .cell {
            width: var(--cell-size);
            height: var(--cell-size);
            background: linear-gradient(145deg, #64748b, #475569);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: calc(var(--cell-size) * 0.65);
            font-weight: 800;
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.2s ease;
            border: 1px solid #94a3b8;
            box-shadow:
                0 2px 4px rgba(0, 0, 0, 0.3),
                inset 0 1px 0 rgba(203, 213, 225, 0.3);
            position: relative;
        }

        .cell:hover {
            background: linear-gradient(145deg, #94a3b8, #64748b);
            transform: scale(1.05);
            box-shadow:
                0 4px 8px rgba(0, 0, 0, 0.4),
                inset 0 1px 0 rgba(203, 213, 225, 0.4);
        }

        .cell:active {
            transform: scale(0.95);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4);
        }

        /* 已挖掘格子 - 柔和的浅灰色，不刺眼 */
        .cell.revealed {
            background: linear-gradient(145deg, #e2e8f0, #cbd5e1);
            box-shadow:
                inset 0 2px 4px rgba(0, 0, 0, 0.1),
                inset 0 -1px 0 rgba(255, 255, 255, 0.4);
            border: 1px solid #94a3b8;
            color: #1e293b;
        }

        .cell.revealed:hover {
            background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
            transform: none;
        }

        .cell.mine {
            background: linear-gradient(145deg, #ef4444, #dc2626) !important;
            color: #ffffff;
            border: 2px solid #fca5a5 !important;
            animation: mineExplode 0.4s ease-out;
            box-shadow:
                0 0 20px rgba(239, 68, 68, 0.6),
                inset 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        @keyframes mineExplode {
            0% { transform: scale(1); box-shadow: 0 0 20px rgba(239, 68, 68, 0.6); }
            50% { transform: scale(1.15); box-shadow: 0 0 30px rgba(239, 68, 68, 0.8); }
            100% { transform: scale(1); box-shadow: 0 0 20px rgba(239, 68, 68, 0.6); }
        }

        .cell.flagged::after {
            content: '🚩';
            font-size: calc(var(--cell-size) * 0.75);
            animation: flagWave 0.3s ease-out;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }

        @keyframes flagWave {
            0% { transform: scale(0) rotate(-10deg); }
            50% { transform: scale(1.2) rotate(5deg); }
            100% { transform: scale(1) rotate(0deg); }
        }

        /* 数字颜色 - 高对比度，清晰可见 */
        .cell.number-1 { color: #1e40af; font-weight: 900; text-shadow: 0 1px 3px rgba(0,0,0,0.3); }
        .cell.number-2 { color: #047857; font-weight: 900; text-shadow: 0 1px 3px rgba(0,0,0,0.3); }
        .cell.number-3 { color: #b91c1c; font-weight: 900; text-shadow: 0 1px 3px rgba(0,0,0,0.3); }
        .cell.number-4 { color: #6b21a8; font-weight: 900; text-shadow: 0 1px 3px rgba(0,0,0,0.3); }
        .cell.number-5 { color: #991b1b; font-weight: 900; text-shadow: 0 1px 3px rgba(0,0,0,0.3); }
        .cell.number-6 { color: #0c4a6e; font-weight: 900; text-shadow: 0 1px 3px rgba(0,0,0,0.3); }
        .cell.number-7 { color: #111827; font-weight: 900; text-shadow: 0 1px 3px rgba(0,0,0,0.3); }
        .cell.number-8 { color: #374151; font-weight: 900; text-shadow: 0 1px 3px rgba(0,0,0,0.3); }

        .cell.quick-dig-highlight {
            background: linear-gradient(145deg, #fbbf24, #f59e0b) !important;
            border: 2px solid #fbbf24 !important;
            box-shadow:
                0 0 20px rgba(251, 191, 36, 0.6) !important,
                inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
            animation: quickDigPulse 0.8s ease-in-out infinite alternate;
        }

        @keyframes quickDigPulse {
            0% {
                transform: scale(1);
                box-shadow: 0 0 20px rgba(251, 191, 36, 0.6);
            }
            100% {
                transform: scale(1.08);
                box-shadow: 0 0 30px rgba(251, 191, 36, 0.8);
            }
        }
        
        /* 排行榜面板样式 - 固定左侧 */
        .leaderboard-panel {
            position: fixed;
            left: 0;
            top: 0;
            width: 280px;
            height: 100vh;
            background: rgba(30, 41, 59, 0.95);
            backdrop-filter: blur(20px);
            padding: 16px 12px;
            overflow-y: auto;
            border-right: 1px solid rgba(148, 163, 184, 0.2);
            z-index: 100;
            transition: transform 0.3s ease;
        }

        .leaderboard-panel.hidden {
            transform: translateX(-100%);
        }

        .leaderboard-header h3 {
            margin: 0 0 12px 0;
            font-size: 18px;
            text-align: center;
            color: var(--text-primary);
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .leaderboard-tabs {
            display: flex;
            gap: 4px;
            margin-bottom: 16px;
            background: rgba(0, 0, 0, 0.2);
            padding: 4px;
            border-radius: var(--border-radius-small);
            border: 1px solid var(--border-color);
        }

        .tab-button {
            flex: 1;
            padding: 8px 6px;
            font-size: 11px;
            background: transparent;
            border: none;
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.2s ease;
            font-weight: 600;
            color: var(--text-muted);
        }

        .tab-button:hover {
            background: rgba(148, 163, 184, 0.2);
            color: var(--text-secondary);
        }

        .tab-button.active {
            background: linear-gradient(145deg, var(--primary-color), var(--primary-hover));
            color: white;
            box-shadow: var(--shadow-light);
        }

        .leaderboard-list {
            display: block;
        }

        .leaderboard-item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            margin: 3px 0;
            background: linear-gradient(145deg, rgba(51, 65, 85, 0.8), rgba(30, 41, 59, 0.6));
            border-radius: var(--border-radius-small);
            font-size: 12px;
            transition: all 0.2s ease;
            border: 1px solid var(--border-color);
        }

        .leaderboard-item:hover {
            background: linear-gradient(145deg, rgba(71, 85, 105, 0.9), rgba(51, 65, 85, 0.7));
            transform: translateX(6px);
            box-shadow: var(--shadow-light);
        }

        .leaderboard-rank {
            font-weight: 800;
            color: var(--text-muted);
            min-width: 28px;
            text-align: center;
            font-size: 13px;
        }

        .leaderboard-item:nth-child(1) .leaderboard-rank { color: #fbbf24; }
        .leaderboard-item:nth-child(2) .leaderboard-rank { color: #e5e7eb; }
        .leaderboard-item:nth-child(3) .leaderboard-rank { color: #d97706; }

        .leaderboard-username {
            flex: 1;
            margin: 0 10px;
            font-weight: 600;
            color: var(--text-primary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .leaderboard-time {
            font-family: 'JetBrains Mono', 'Courier New', monospace;
            font-weight: 700;
            color: var(--danger-color);
            font-size: 11px;
            background: rgba(239, 68, 68, 0.2);
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        /* 模态框样式 */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 280px;
            top: 0;
            width: calc(100% - 280px);
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            animation: modalFadeIn 0.3s ease-out;
        }

        @keyframes modalFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .modal-content {
            background: linear-gradient(145deg, #1e293b, #0f172a);
            backdrop-filter: blur(20px);
            position: absolute;
            top: max(40%, 250px);
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 32px;
            border-radius: var(--border-radius);
            width: 90%;
            max-width: 450px;
            text-align: center;
            box-shadow: var(--shadow-heavy);
            border: 2px solid rgba(148, 163, 184, 0.3);
            animation: modalFadeInDirect 0.2s ease-out;
            color: var(--text-primary);
        }

        @keyframes modalSlideIn {
            from {
                transform: translateY(-50px) scale(0.9);
                opacity: 0;
            }
            to {
                transform: translateY(0) scale(1);
                opacity: 1;
            }
        }

        @keyframes modalFadeInDirect {
            from {
                transform: translate(-50%, -50%) scale(0.95);
                opacity: 0;
            }
            to {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
        }

        .modal-button {
            background: linear-gradient(145deg, var(--primary-color), var(--primary-hover));
            border: 1px solid var(--primary-color);
            border-radius: var(--border-radius-small);
            padding: 12px 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            margin: 6px;
            transition: all 0.2s ease;
            color: white;
            box-shadow: var(--shadow-medium);
        }

        .modal-button:hover {
            background: linear-gradient(145deg, var(--primary-hover), #1e40af);
            transform: translateY(-1px);
            box-shadow: var(--shadow-heavy);
        }

        .modal-button:active {
            transform: translateY(0);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .modal-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #475569;
            border-radius: var(--border-radius-small);
            font-size: 14px;
            margin: 16px 0;
            box-sizing: border-box;
            transition: all 0.2s ease;
            background: linear-gradient(145deg, #334155, #1e293b);
            color: var(--text-primary);
        }

        .modal-input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
            background: linear-gradient(145deg, #475569, #334155);
        }

        .modal-input::placeholder {
            color: var(--text-muted);
        }

        /* 为输入框恢复文本选择功能 */
        .modal-input {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }

        /* 模态框内容样式 - 高对比度 */
        #modal-title {
            color: var(--text-primary) !important;
            font-weight: 700 !important;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
        }

        #modal-message {
            color: var(--text-secondary) !important;
            line-height: 1.6 !important;
        }

        #modal-icon {
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)) !important;
        }

        /* 取消按钮特殊样式 */
        #modal-cancel {
            background: linear-gradient(145deg, #6b7280, #4b5563) !important;
            border-color: #6b7280 !important;
        }

        #modal-cancel:hover {
            background: linear-gradient(145deg, #4b5563, #374151) !important;
        }
        
        /* 响应式设计 */
        @media (max-width: 1200px) {
            .leaderboard-panel {
                position: relative;
                width: 100%;
                height: auto;
                max-height: 250px;
                margin-bottom: 20px;
            }

            .main-container {
                flex-direction: column;
            }

            .game-container {
                position: relative;
                left: auto;
                top: auto;
                transform: none;
                margin: 20px auto;
            }

            .right-panel {
                position: relative !important;
                left: auto !important;
                top: auto !important;
                transform: none !important;
                margin: 20px auto;
                width: fit-content;
            }

            .difficulty-buttons {
                flex-direction: row;
            }

            .modal {
                left: 0;
                width: 100%;
            }

            .modal-content {
                top: max(45%, 280px);
            }
        }

        @media (max-width: 768px) {
            .leaderboard-panel {
                display: none;
            }

            .game-container {
                position: absolute;
                left: 50%;
                top: max(40%, 150px);
                transform: translate(-50%, -50%);
            }

            .right-panel {
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                left: auto !important;
                top: auto !important;
                transform: none !important;
                padding: 12px;
            }

            .game-content {
                padding: 16px;
            }

            :root {
                --cell-size: 22px;
                --counter-font-size: 16px;
                --smiley-size: 28px;
                --border-radius: 8px;
                --border-radius-small: 6px;
            }

            .difficulty-buttons {
                gap: 4px;
                flex-direction: row;
            }

            .difficulty-button {
                padding: 6px 10px;
                font-size: 10px;
                min-width: 50px;
            }

            .help-button {
                padding: 6px 10px;
                font-size: 10px;
            }

            .game-header {
                padding: 8px 12px;
            }

            .modal {
                left: 0;
                width: 100%;
            }

            .modal-content {
                top: max(50%, 300px);
                padding: 20px;
            }
        }

        @media (max-width: 480px) {
            :root {
                --cell-size: 20px;
                --counter-font-size: 14px;
                --smiley-size: 26px;
            }

            .difficulty-selector {
                flex-direction: column;
                gap: 10px;
                align-items: stretch;
            }

            .difficulty-buttons {
                justify-content: center;
            }
        }

        @media (max-width: 480px) {
            :root {
                --cell-size: 22px;
                --counter-font-size: 16px;
                --smiley-size: 28px;
            }

            .game-container {
                padding: 12px;
            }

            .difficulty-selector {
                flex-direction: column;
                gap: 12px;
                align-items: stretch;
            }

            .difficulty-buttons {
                justify-content: center;
            }

            .game-header {
                padding: 10px 12px;
            }
        }

        /* 移除入场动画，避免从右下角出现的效果 */
        .game-container {
            /* 移除动画，直接显示 */
        }

        .leaderboard-panel {
            /* 移除动画，直接显示 */
        }

        /* 滚动条美化 */
        .leaderboard-panel::-webkit-scrollbar {
            width: 6px;
        }

        .leaderboard-panel::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 3px;
        }

        .leaderboard-panel::-webkit-scrollbar-thumb {
            background: linear-gradient(145deg, var(--primary-color), var(--primary-hover));
            border-radius: 3px;
        }

        .leaderboard-panel::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(145deg, var(--primary-hover), #1e40af);
        }

        /* 页脚样式 */
        .footer {
            position: fixed;
            bottom: 0;
            left: 280px;
            right: 0;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(20px);
            border-top: 1px solid rgba(148, 163, 184, 0.2);
            padding: 8px 20px;
            z-index: 1000;
            box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.3);
        }

        .footer-content {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 16px;
        }

        .footer-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
        }

        .footer-icon {
            font-size: 16px;
            animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }

        .footer-name {
            background: linear-gradient(135deg, var(--primary-color), var(--success-color));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 700;
        }

        .github-link {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            background: linear-gradient(145deg, #374151, #1f2937);
            border-radius: 50%;
            color: var(--text-secondary);
            text-decoration: none;
            transition: all 0.3s ease;
            border: 1px solid rgba(148, 163, 184, 0.2);
            box-shadow: var(--shadow-light);
        }

        .github-link:hover {
            background: linear-gradient(145deg, #4b5563, #374151);
            color: var(--text-primary);
            transform: translateY(-2px) scale(1.05);
            box-shadow: var(--shadow-medium);
        }

        .github-icon {
            width: 20px;
            height: 20px;
            transition: transform 0.3s ease;
        }

        .github-link:hover .github-icon {
            transform: rotate(360deg);
        }

        /* 响应式页脚 */
        @media (max-width: 1200px) {
            .footer {
                left: 0;
                right: 0;
            }
        }

        @media (max-width: 768px) {
            .footer {
                padding: 6px 16px;
                left: 0;
                right: 0;
            }

            .footer-title {
                font-size: 12px;
            }

            .footer-icon {
                font-size: 14px;
            }

            .github-link {
                width: 28px;
                height: 28px;
            }

            .github-icon {
                width: 16px;
                height: 16px;
            }

            .footer-content {
                gap: 12px;
            }
        }
    </style>
</head>
<body>
    <div class="main-container">
        <!-- 排行榜面板 -->
        <div class="leaderboard-panel">
            <div class="leaderboard-header">
                <h3>🏆 排行榜</h3>
                <div class="leaderboard-tabs">
                    <button class="tab-button active" onclick="switchLeaderboard('beginner')">初级</button>
                    <button class="tab-button" onclick="switchLeaderboard('intermediate')">中级</button>
                    <button class="tab-button" onclick="switchLeaderboard('expert')">专家</button>
                </div>
            </div>
            <div class="leaderboard-list" id="leaderboard-list">
                <div style="text-align: center; padding: 20px; color: #666;">加载中...</div>
            </div>
        </div>

        <!-- 游戏区域 -->
        <div class="game-container">
            <div class="game-content">
                <div class="game-header">
                    <div class="counter" id="mine-counter">010</div>
                    <button class="smiley-button" id="smiley-button" onclick="newGame()">😊</button>
                    <div class="counter" id="timer">000</div>
                </div>

                <div class="game-board">
                    <div class="board-grid" id="board-grid"></div>
                </div>
            </div>
        </div>

        <!-- 右侧控制面板 -->
        <div class="right-panel">
            <div class="difficulty-selector">
                <div class="difficulty-buttons">
                    <button class="difficulty-button active" onclick="setDifficulty('beginner')">初级</button>
                    <button class="difficulty-button" onclick="setDifficulty('intermediate')">中级</button>
                    <button class="difficulty-button" onclick="setDifficulty('expert')">专家</button>
                </div>
                <button class="help-button" onclick="showHelp()">帮助</button>
            </div>
        </div>
    </div>

    <!-- 模态框 -->
    <div id="game-modal" class="modal">
        <div class="modal-content">
            <div id="modal-icon" style="font-size: 42px; margin-bottom: 12px;">😊</div>
            <div id="modal-title" style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">游戏提示</div>
            <div id="modal-message" style="margin-bottom: 20px;">消息内容</div>
            <div id="modal-input-container" style="display: none;">
                <input type="text" id="modal-input" class="modal-input" placeholder="请输入您的用户名（最多8个汉字或16个字符）" maxlength="16">
            </div>
            <div>
                <button id="modal-cancel" class="modal-button" onclick="handleModalCancel()" style="display: none;">取消</button>
                <button id="modal-confirm" class="modal-button" onclick="handleModalConfirm()">确定</button>
            </div>
        </div>
    </div>

    <!-- 页脚 -->
    <footer class="footer">
        <div class="footer-content">
            <div class="footer-title">
                <span class="footer-icon">💣</span>
                <span class="footer-name">cf-minesweeper</span>
            </div>
            <a href="https://github.com/kadidalax/cf-minesweeper" target="_blank" class="github-link" title="查看源代码">
                <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
            </a>
        </div>
    </footer>

    <script>
        // 简化的扫雷游戏类 - 基于simple.js优化
        class MinesweeperGame {
            constructor() {
                this.difficulties = {
                    beginner: { rows: 9, cols: 9, mines: 10 },
                    intermediate: { rows: 16, cols: 16, mines: 40 },
                    expert: { rows: 16, cols: 30, mines: 99 }
                };
                this.currentDifficulty = 'beginner';
                this.board = [];
                this.revealed = [];
                this.flagged = [];
                this.gameState = 'ready';
                this.firstClick = true;
                this.startTime = null;
                this.timer = null;
                this.mineCount = 0;
                this.flagCount = 0;

                // 简化的双键快速挖掘状态
                this.mouseButtons = {
                    left: false,
                    right: false
                };
                this.quickDigCell = null;
            }

            initGame() {
                const config = this.difficulties[this.currentDifficulty];
                this.rows = config.rows;
                this.cols = config.cols;
                this.mineCount = config.mines;
                this.flagCount = 0;

                this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
                this.revealed = Array(this.rows).fill().map(() => Array(this.cols).fill(false));
                this.flagged = Array(this.rows).fill().map(() => Array(this.cols).fill(false));

                this.gameState = 'ready';
                this.firstClick = true;
                this.startTime = null;

                if (this.timer) {
                    clearInterval(this.timer);
                    this.timer = null;
                }

                this.createBoard();
                this.updateDisplay();

                document.getElementById('smiley-button').textContent = '😊';
                document.getElementById('timer').textContent = '000';

                // 延迟更新位置，确保DOM渲染完成
                setTimeout(() => {
                    this.updateGamePosition();
                    this.updateRightPanelPosition();
                }, 100);
            }

            createBoard() {
                const boardGrid = document.getElementById('board-grid');
                boardGrid.innerHTML = '';

                // 简化的响应式计算
                this.calculateCellSize();

                boardGrid.style.gridTemplateColumns = 'repeat(' + this.cols + ', var(--cell-size))';
                boardGrid.style.gridTemplateRows = 'repeat(' + this.rows + ', var(--cell-size))';

                for (let row = 0; row < this.rows; row++) {
                    for (let col = 0; col < this.cols; col++) {
                        const cell = document.createElement('div');
                        cell.className = 'cell';

                        // 阻止右键菜单
                        cell.addEventListener('contextmenu', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            return false;
                        });

                        // 鼠标事件
                        cell.addEventListener('mousedown', (e) => this.handleMouseDown(row, col, e));
                        cell.addEventListener('mouseup', (e) => this.handleMouseUp(row, col, e));

                        // 触摸支持 - 简化版本
                        let touchTimer = null;
                        cell.addEventListener('touchstart', (e) => {
                            touchTimer = setTimeout(() => {
                                this.handleRightClick(row, col, e);
                                if (navigator.vibrate) navigator.vibrate(50);
                            }, 500);
                        });

                        cell.addEventListener('touchend', (e) => {
                            if (touchTimer) {
                                clearTimeout(touchTimer);
                                this.handleLeftClick(row, col, e);
                            }
                        });

                        cell.addEventListener('touchmove', () => {
                            if (touchTimer) {
                                clearTimeout(touchTimer);
                                touchTimer = null;
                            }
                        });

                        boardGrid.appendChild(cell);
                    }
                }
            }

            // 优化的格子大小计算 - 确保一页显示所有格子
            calculateCellSize() {
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                // 为排行榜、游戏头部、按钮等预留空间
                const leaderboardWidth = window.innerWidth > 1200 ? 280 : 0;
                const reservedWidth = leaderboardWidth + 200; // 为右侧面板预留更多空间
                const reservedHeight = 300; // 头部、按钮、边距等

                const availableWidth = viewportWidth - reservedWidth;
                const availableHeight = viewportHeight - reservedHeight;

                const maxCellSizeByWidth = Math.floor(availableWidth / this.cols);
                const maxCellSizeByHeight = Math.floor(availableHeight / this.rows);

                // 确保格子大小适中，优先保证全部显示
                let optimalSize = Math.min(maxCellSizeByWidth, maxCellSizeByHeight);
                optimalSize = Math.max(16, Math.min(35, optimalSize));

                document.documentElement.style.setProperty('--cell-size', optimalSize + 'px');
                document.documentElement.style.setProperty('--counter-font-size', Math.max(14, optimalSize * 0.6) + 'px');
                document.documentElement.style.setProperty('--smiley-size', Math.max(28, optimalSize * 1.1) + 'px');

                // 延迟更新位置，确保DOM更新完成
                setTimeout(() => {
                    this.updateGamePosition();
                    this.updateRightPanelPosition();
                }, 50);
            }

            // 更新游戏容器位置，确保不超出屏幕边界
            updateGamePosition() {
                const gameContainer = document.querySelector('.game-container');
                const gameContent = document.querySelector('.game-content');

                if (gameContainer && gameContent) {
                    const viewportHeight = window.innerHeight;
                    const gameHeight = gameContent.offsetHeight;

                    // 计算理想的top位置（35%）
                    let idealTop = viewportHeight * 0.35;

                    // 确保游戏区域上部不会超出屏幕（至少留20px边距）
                    const minTop = (gameHeight / 2) + 20;

                    // 确保游戏区域下部不会超出屏幕（至少留20px边距）
                    const maxTop = viewportHeight - (gameHeight / 2) - 20;

                    // 应用边界限制
                    const finalTop = Math.max(minTop, Math.min(idealTop, maxTop));

                    gameContainer.style.top = finalTop + 'px';
                    gameContainer.style.transform = 'translate(-50%, -50%)';
                }
            }

            // 更新右侧面板位置，使其紧贴游戏区域
            updateRightPanelPosition() {
                const gameContent = document.querySelector('.game-content');
                const rightPanel = document.querySelector('.right-panel');

                if (gameContent && rightPanel && window.innerWidth > 768) {
                    const gameRect = gameContent.getBoundingClientRect();
                    const panelWidth = rightPanel.offsetWidth;

                    // 计算面板应该在的位置（游戏区域右边 + 一点间距）
                    const leftPosition = gameRect.right + 20;

                    // 确保不超出屏幕右边界
                    const maxLeft = window.innerWidth - panelWidth - 20;
                    const finalLeft = Math.min(leftPosition, maxLeft);

                    rightPanel.style.left = finalLeft + 'px';
                    rightPanel.style.top = gameRect.top + 'px';
                    rightPanel.style.transform = 'none';
                }
            }

            generateMines(firstClickRow, firstClickCol) {
                const positions = [];
                for (let row = 0; row < this.rows; row++) {
                    for (let col = 0; col < this.cols; col++) {
                        if (Math.abs(row - firstClickRow) <= 1 && Math.abs(col - firstClickCol) <= 1) {
                            continue;
                        }
                        positions.push([row, col]);
                    }
                }

                // Fisher-Yates洗牌
                for (let i = positions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [positions[i], positions[j]] = [positions[j], positions[i]];
                }

                for (let i = 0; i < this.mineCount && i < positions.length; i++) {
                    const [row, col] = positions[i];
                    this.board[row][col] = -1;
                }

                this.calculateNumbers();
            }

            calculateNumbers() {
                for (let row = 0; row < this.rows; row++) {
                    for (let col = 0; col < this.cols; col++) {
                        if (this.board[row][col] !== -1) {
                            let count = 0;
                            for (let dr = -1; dr <= 1; dr++) {
                                for (let dc = -1; dc <= 1; dc++) {
                                    const newRow = row + dr;
                                    const newCol = col + dc;
                                    if (this.isValidCell(newRow, newCol) && this.board[newRow][newCol] === -1) {
                                        count++;
                                    }
                                }
                            }
                            this.board[row][col] = count;
                        }
                    }
                }
            }

            isValidCell(row, col) {
                return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
            }

            handleLeftClick(row, col, event) {
                event.preventDefault();
                if (this.gameState === 'won' || this.gameState === 'lost') return;
                if (this.flagged[row][col]) return;

                if (this.firstClick) {
                    this.generateMines(row, col);
                    this.firstClick = false;
                    this.gameState = 'playing';
                    this.startTimer();
                }

                this.revealCell(row, col);
                this.updateDisplay();
                this.checkGameState();
            }

            handleRightClick(row, col, event) {
                event.preventDefault();
                if (this.gameState === 'won' || this.gameState === 'lost') return;
                if (this.revealed[row][col]) return;

                this.flagged[row][col] = !this.flagged[row][col];
                this.flagCount += this.flagged[row][col] ? 1 : -1;
                this.updateDisplay();
            }

            // 简化的双键快速挖掘
            handleMouseDown(row, col, event) {
                if (this.gameState === 'won' || this.gameState === 'lost') return;

                if (event.button === 0) {
                    this.mouseButtons.left = true;
                } else if (event.button === 2) {
                    this.mouseButtons.right = true;
                }

                if (this.mouseButtons.left && this.mouseButtons.right) {
                    this.quickDigCell = { row, col };
                    this.highlightQuickDigArea(row, col, true);
                    // 双键时小人变惊讶表情
                    document.getElementById('smiley-button').textContent = '😮';
                }
            }

            handleMouseUp(row, col, event) {
                if (this.gameState === 'won' || this.gameState === 'lost') return;

                const wasQuickDig = this.mouseButtons.left && this.mouseButtons.right;

                if (wasQuickDig && this.quickDigCell &&
                    this.quickDigCell.row === row && this.quickDigCell.col === col) {
                    this.performQuickDig(row, col);
                } else if (event.button === 0 && !this.mouseButtons.right) {
                    this.handleLeftClick(row, col, event);
                } else if (event.button === 2 && !this.mouseButtons.left) {
                    this.handleRightClick(row, col, event);
                }

                // 重置状态
                if (event.button === 0) this.mouseButtons.left = false;
                if (event.button === 2) this.mouseButtons.right = false;

                if (this.quickDigCell) {
                    this.highlightQuickDigArea(this.quickDigCell.row, this.quickDigCell.col, false);
                    this.quickDigCell = null;
                    // 双键结束时恢复正常表情（如果游戏还在进行中）
                    if (this.gameState === 'playing' || this.gameState === 'ready') {
                        document.getElementById('smiley-button').textContent = '😊';
                    }
                }
            }

            performQuickDig(row, col) {
                if (!this.revealed[row][col] || this.board[row][col] <= 0) return;

                let flaggedCount = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const newRow = row + dr;
                        const newCol = col + dc;
                        if (this.isValidCell(newRow, newCol) && this.flagged[newRow][newCol]) {
                            flaggedCount++;
                        }
                    }
                }

                if (flaggedCount === this.board[row][col]) {
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const newRow = row + dr;
                            const newCol = col + dc;
                            if (this.isValidCell(newRow, newCol) &&
                                !this.revealed[newRow][newCol] &&
                                !this.flagged[newRow][newCol]) {
                                this.revealCell(newRow, newCol);
                            }
                        }
                    }
                    this.updateDisplay();
                    this.checkGameState();
                }
            }

            highlightQuickDigArea(row, col, highlight) {
                if (!this.revealed[row][col] || this.board[row][col] <= 0) return;

                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const newRow = row + dr;
                        const newCol = col + dc;
                        if (this.isValidCell(newRow, newCol)) {
                            const cellIndex = newRow * this.cols + newCol;
                            const cellElement = document.querySelectorAll('.cell')[cellIndex];
                            if (cellElement) {
                                if (highlight) {
                                    cellElement.classList.add('quick-dig-highlight');
                                } else {
                                    cellElement.classList.remove('quick-dig-highlight');
                                }
                            }
                        }
                    }
                }
            }

            revealCell(row, col) {
                if (!this.isValidCell(row, col) || this.revealed[row][col] || this.flagged[row][col]) {
                    return;
                }

                this.revealed[row][col] = true;

                if (this.board[row][col] === -1) {
                    this.gameState = 'lost';
                    this.revealAllMines();
                    return;
                }

                if (this.board[row][col] === 0) {
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            this.revealCell(row + dr, col + dc);
                        }
                    }
                }
            }

            revealAllMines() {
                for (let row = 0; row < this.rows; row++) {
                    for (let col = 0; col < this.cols; col++) {
                        if (this.board[row][col] === -1) {
                            this.revealed[row][col] = true;
                        }
                    }
                }
            }

            checkGameState() {
                if (this.gameState === 'lost') {
                    document.getElementById('smiley-button').textContent = '😵';
                    this.stopTimer();
                    setTimeout(() => {
                        showModal('游戏失败', '💣', '踩到地雷了！点击笑脸重新开始。');
                    }, 100);
                    return;
                }

                let unrevealedCount = 0;
                for (let row = 0; row < this.rows; row++) {
                    for (let col = 0; col < this.cols; col++) {
                        if (!this.revealed[row][col] && this.board[row][col] !== -1) {
                            unrevealedCount++;
                        }
                    }
                }

                if (unrevealedCount === 0) {
                    this.gameState = 'won';
                    document.getElementById('smiley-button').textContent = '😎';
                    this.stopTimer();

                    // 自动标记剩余地雷
                    for (let row = 0; row < this.rows; row++) {
                        for (let col = 0; col < this.cols; col++) {
                            if (this.board[row][col] === -1 && !this.flagged[row][col]) {
                                this.flagged[row][col] = true;
                                this.flagCount++;
                            }
                        }
                    }

                    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                    setTimeout(async () => {
                        const message = '用时：' + elapsed + '秒<br>难度：' + this.getDifficultyName() + '<br><br>恭喜！请输入用户名上传成绩：';
                        const username = await showModal('胜利！', '🎉', message, true, true);
                        if (username && username.trim()) {
                            uploadScore(username.trim(), elapsed, this.currentDifficulty);
                        }
                    }, 100);
                }
            }

            startTimer() {
                this.startTime = Date.now();
                this.timer = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                    const displayTime = Math.min(elapsed, 999);
                    document.getElementById('timer').textContent = displayTime.toString().padStart(3, '0');
                }, 1000);
            }

            stopTimer() {
                if (this.timer) {
                    clearInterval(this.timer);
                    this.timer = null;
                }
            }

            getDifficultyName() {
                const names = {
                    beginner: '初级',
                    intermediate: '中级',
                    expert: '专家'
                };
                return names[this.currentDifficulty] || '未知';
            }

            updateDisplay() {
                const remainingMines = this.mineCount - this.flagCount;
                document.getElementById('mine-counter').textContent =
                    Math.max(-99, Math.min(999, remainingMines)).toString().padStart(3, '0');

                const cells = document.querySelectorAll('.cell');
                cells.forEach((cell, index) => {
                    const row = Math.floor(index / this.cols);
                    const col = index % this.cols;

                    cell.className = 'cell';
                    cell.textContent = '';

                    if (this.flagged[row][col]) {
                        cell.classList.add('flagged');
                    } else if (this.revealed[row][col]) {
                        cell.classList.add('revealed');
                        if (this.board[row][col] === -1) {
                            cell.classList.add('mine');
                            cell.textContent = '💣';
                        } else if (this.board[row][col] > 0) {
                            cell.classList.add('number-' + this.board[row][col]);
                            cell.textContent = this.board[row][col];
                        }
                    }
                });
            }
        }

        // 全局变量
        let game = null;
        let currentLeaderboardDifficulty = 'beginner';
        let modalCallback = null;

        // 模态框函数
        function showModal(title, icon, message, showInput = false, showCancel = false) {
            document.getElementById('modal-title').textContent = title;
            document.getElementById('modal-icon').textContent = icon;
            document.getElementById('modal-message').innerHTML = message;

            const inputContainer = document.getElementById('modal-input-container');
            const cancelButton = document.getElementById('modal-cancel');
            const confirmButton = document.getElementById('modal-confirm');
            const input = document.getElementById('modal-input');

            if (showInput) {
                inputContainer.style.display = 'block';
                input.value = '';
                setTimeout(() => input.focus(), 100);
            } else {
                inputContainer.style.display = 'none';
            }

            if (showCancel) {
                cancelButton.style.display = 'inline-block';
                confirmButton.textContent = '确定';
            } else {
                cancelButton.style.display = 'none';
                confirmButton.textContent = '确定';
            }

            document.getElementById('game-modal').style.display = 'block';

            return new Promise((resolve) => {
                modalCallback = resolve;
            });
        }

        function closeModal() {
            document.getElementById('game-modal').style.display = 'none';
            if (modalCallback) {
                modalCallback(null);
                modalCallback = null;
            }
        }

        function handleModalConfirm() {
            const input = document.getElementById('modal-input');
            const inputContainer = document.getElementById('modal-input-container');
            const cancelButton = document.getElementById('modal-cancel');

            let value;
            if (inputContainer.style.display !== 'none') {
                // 有输入框的情况
                value = input.value.trim();

                // 验证用户名长度（支持8个汉字或16个字符）
                if (value && [...value].length > 16) {
                    showModal('用户名过长', '⚠️', '用户名最多支持8个汉字或16个字符，请重新输入。');
                    return;
                }

                if (value && value.length === 0) {
                    showModal('用户名不能为空', '⚠️', '请输入有效的用户名。');
                    return;
                }
            } else if (cancelButton.style.display !== 'none') {
                // 有取消按钮的确认对话框
                value = true;
            } else {
                // 普通提示框
                value = true;
            }

            document.getElementById('game-modal').style.display = 'none';
            if (modalCallback) {
                modalCallback(value);
                modalCallback = null;
            }
        }

        function handleModalCancel() {
            document.getElementById('game-modal').style.display = 'none';
            if (modalCallback) {
                modalCallback(false);
                modalCallback = null;
            }
        }

        // 全局函数
        function setDifficulty(difficulty) {
            if (!game) return;

            document.querySelectorAll('.difficulty-button').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');

            game.currentDifficulty = difficulty;
            game.initGame();
        }

        function newGame() {
            if (game) {
                game.initGame();
            }
        }

        function showHelp() {
            const helpMessage =
                '<div style="text-align: left; line-height: 1.6;">' +
                '<strong>🎯 游戏目标：</strong><br>' +
                '找出所有地雷而不踩到它们！<br><br>' +
                '<strong>🖱️ 操作方法：</strong><br>' +
                '• 左键：挖掘格子<br>' +
                '• 右键：标记地雷<br>' +
                '• 双键：在数字上同时按左右键快速挖掘<br><br>' +
                '<strong>📱 移动端：</strong><br>' +
                '长按格子标记地雷<br><br>' +
                '<strong>🏆 难度选择：</strong><br>' +
                '• 初级：9×9，10个地雷<br>' +
                '• 中级：16×16，40个地雷<br>' +
                '• 专家：30×16，99个地雷<br><br>' +
                '<strong>💡 提示：</strong><br>' +
                '数字表示周围8个格子中地雷的数量' +
                '</div>';
            showModal('怎么玩', '🎯', helpMessage);
        }

        function switchLeaderboard(difficulty) {
            currentLeaderboardDifficulty = difficulty;

            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');

            loadLeaderboard(difficulty);
        }

        async function loadLeaderboard(difficulty) {
            try {
                const response = await fetch('/api/leaderboard/' + difficulty);
                const result = await response.json();

                const listElement = document.getElementById('leaderboard-list');
                if (result.success && result.data.length > 0) {
                    listElement.innerHTML = result.data.map((record, index) => {
                        const rank = index + 1;
                        return '<div class="leaderboard-item">' +
                               '<div class="leaderboard-rank">' + rank + '</div>' +
                               '<div class="leaderboard-username">' + record.username + '</div>' +
                               '<div class="leaderboard-time">' + record.time + 's</div>' +
                               '</div>';
                    }).join('');
                } else {
                    listElement.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">暂无记录</div>';
                }
            } catch (error) {
                document.getElementById('leaderboard-list').innerHTML =
                    '<div style="text-align: center; padding: 20px; color: #d00;">加载失败</div>';
            }
        }

        async function uploadScore(username, time, difficulty) {
            try {
                // 首先获取当前排行榜数据，检查用户是否已有记录
                const getResponse = await fetch('/api/leaderboard/' + difficulty);
                const getResult = await getResponse.json();

                let existingRecord = null;
                let isNewRecord = false;
                let rankImprovement = '';

                if (getResult.success && getResult.data.length > 0) {
                    // 查找用户的现有记录
                    existingRecord = getResult.data.find(record => record.username === username.trim());

                    if (existingRecord) {
                        // 用户已有记录，比较成绩
                        if (time < existingRecord.time) {
                            // 新成绩更好
                            const improvement = existingRecord.time - time;
                            isNewRecord = true;
                            rankImprovement = '恭喜！您的成绩提升了 ' + improvement + ' 秒！';
                        } else if (time > existingRecord.time) {
                            // 新成绩更差，直接提醒并取消上传
                            const decline = time - existingRecord.time;
                            showModal(
                                '成绩未达最佳',
                                '📊',
                                '您的当前成绩：' + time + '秒<br>您的最佳成绩：' + existingRecord.time + '秒<br><br>新成绩比最佳成绩慢了 ' + decline + ' 秒，未上传到排行榜。<br><br>继续努力，争取打破个人纪录！'
                            );
                            return; // 直接取消上传
                        } else {
                            // 成绩相同
                            showModal('成绩相同', 'ℹ️', '您的成绩与之前的最佳成绩相同（' + time + '秒），无需重复上传。');
                            return;
                        }
                    }
                }

                // 上传成绩
                const response = await fetch('/api/leaderboard/' + difficulty, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, time })
                });

                const result = await response.json();
                if (result.success) {
                    // 查找用户在新排行榜中的排名
                    const userRank = result.data.findIndex(record => record.username === username.trim()) + 1;

                    let successMessage = '';
                    let modalTitle = '';
                    let modalIcon = '';

                    if (userRank > 0 && userRank <= 20) {
                        // 用户上榜了
                        modalTitle = '🎉 恭喜上榜！';
                        modalIcon = '🏆';

                        if (isNewRecord && existingRecord) {
                            // 打破个人纪录并上榜
                            const improvement = existingRecord.time - time;
                            successMessage = '🎉 新纪录并成功上榜！<br><br>' +
                                           '旧成绩：' + existingRecord.time + '秒<br>' +
                                           '新成绩：' + time + '秒<br>' +
                                           '提升：' + improvement + '秒<br><br>' +
                                           '🏆 当前排名：第 ' + userRank + ' 名';
                        } else if (!existingRecord) {
                            // 首次上传并上榜
                            successMessage = '🎊 首次上传即上榜！<br><br>' +
                                           '您的成绩：' + time + '秒<br>' +
                                           '🏆 当前排名：第 ' + userRank + ' 名<br><br>' +
                                           '欢迎加入排行榜！';
                        } else {
                            // 其他上榜情况
                            successMessage = '🎉 成功上榜！<br><br>' +
                                           '您的成绩：' + time + '秒<br>' +
                                           '🏆 当前排名：第 ' + userRank + ' 名';
                        }
                    } else {
                        // 用户没有上榜（排名在20名之外或未找到）
                        modalTitle = '📊 成绩已记录';
                        modalIcon = '📈';

                        if (isNewRecord && existingRecord) {
                            // 打破个人纪录但未上榜
                            const improvement = existingRecord.time - time;
                            successMessage = '🎯 个人新纪录！<br><br>' +
                                           '旧成绩：' + existingRecord.time + '秒<br>' +
                                           '新成绩：' + time + '秒<br>' +
                                           '提升：' + improvement + '秒<br><br>' +
                                           '💪 继续努力，争取进入前20名排行榜！';
                        } else if (!existingRecord) {
                            // 首次上传但未上榜
                            successMessage = '📝 首次成绩已记录！<br><br>' +
                                           '您的成绩：' + time + '秒<br><br>' +
                                           '💪 继续练习，争取进入前20名排行榜！<br>' +
                                           '目前需要达到更好的成绩才能上榜。';
                        } else {
                            // 其他未上榜情况
                            successMessage = '📊 成绩已更新！<br><br>' +
                                           '您的成绩：' + time + '秒<br><br>' +
                                           '💪 继续努力，争取进入前20名排行榜！';
                        }
                    }

                    showModal(modalTitle, modalIcon, successMessage);

                    if (currentLeaderboardDifficulty === difficulty) {
                        loadLeaderboard(difficulty);
                    }
                } else {
                    showModal('上传失败', '❌', '上传失败：' + result.error);
                }
            } catch (error) {
                showModal('上传失败', '❌', '上传失败：网络连接错误');
            }
        }

        // 初始化
        window.addEventListener('DOMContentLoaded', () => {
            // 全局禁用右键菜单 - 多重保护
            document.body.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });

            // 禁用选择文本（可选，防止意外选择）
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
            document.body.style.mozUserSelect = 'none';
            document.body.style.msUserSelect = 'none';

            game = new MinesweeperGame();
            game.initGame();
            loadLeaderboard('beginner');

            // 窗口大小变化监听
            window.addEventListener('resize', () => {
                if (game) {
                    game.calculateCellSize();
                    // 延迟更新位置，确保DOM已更新
                    setTimeout(() => {
                        game.updateGamePosition();
                        game.updateRightPanelPosition();
                    }, 100);
                }
            });

            // 全局鼠标事件监听（清理双键状态）
            document.addEventListener('mouseup', (e) => {
                if (game && !e.target.closest('.cell')) {
                    game.mouseButtons.left = false;
                    game.mouseButtons.right = false;
                    if (game.quickDigCell) {
                        game.highlightQuickDigArea(game.quickDigCell.row, game.quickDigCell.col, false);
                        game.quickDigCell = null;
                        // 恢复正常表情（如果游戏还在进行中）
                        if (game.gameState === 'playing' || game.gameState === 'ready') {
                            document.getElementById('smiley-button').textContent = '😊';
                        }
                    }
                }
            });

            // 全局禁用右键菜单，防止浏览器接管
            document.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                return false;
            });


        });
    </script>
</body>
</html>`;
}
