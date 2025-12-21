addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const DEBUG = true; // 开启调试模式
  const TARGET = 'http://mc.w-4.cn:8001';
  
  // 构建目标URL
  const url = new URL(request.url);
  const targetUrl = new URL(TARGET + url.pathname + url.search);
  
  // 调试信息
  if (DEBUG) {
    console.log('原始请求:', request.url);
    console.log('目标URL:', targetUrl.toString());
    console.log('请求方法:', request.method);
    console.log('请求头:', JSON.stringify([...request.headers]));
  }
  
  // 准备请求头
  const headers = new Headers(request.headers);
  headers.set('Host', 'mc.w-4.cn');
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
  headers.set('X-Forwarded-Host', url.host);
  headers.set('X-Forwarded-Proto', url.protocol.slice(0, -1));
  
  // 移除 Cloudflare 特定头
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');
  
  try {
    // 发送请求
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: 'follow'
    });
    
    if (DEBUG) {
      console.log('响应状态:', response.status);
      console.log('响应头:', JSON.stringify([...response.headers]));
    }
    
    return response;
    
  } catch (error) {
    console.error('代理错误:', error);
    
    // 返回详细的错误响应
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>代理错误</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .error { color: #d32f2f; background: #ffebee; padding: 15px; border-radius: 5px; }
          .info { background: #e3f2fd; padding: 15px; border-radius: 5px; margin-top: 20px; }
          code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>代理连接失败</h1>
        <div class="error">
          <h3>错误信息: ${error.message}</h3>
          <p>无法连接到目标服务器: <code>${TARGET}</code></p>
        </div>
        
        <div class="info">
          <h3>排查步骤:</h3>
          <ol>
            <li>检查源站服务器是否运行: <code>systemctl status your-service</code></li>
            <li>检查端口是否监听: <code>netstat -tlnp | grep :8001</code></li>
            <li>检查防火墙: <code>sudo ufw status</code></li>
            <li>从服务器本地测试: <code>curl -v http://localhost:8001</code></li>
            <li>从外部测试: <code>curl -v http://mc.w-4.cn:8001</code></li>
          </ol>
          
          <h3>调试信息:</h3>
          <ul>
            <li>请求时间: ${new Date().toISOString()}</li>
            <li>Cloudflare区域: ${request.cf?.colo || 'unknown'}</li>
            <li>客户端IP: ${request.headers.get('CF-Connecting-IP') || 'unknown'}</li>
          </ul>
        </div>
      </body>
      </html>
    `, {
      status: 502,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}