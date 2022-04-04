<script setup lang="ts">
import { sendMessage } from 'webext-bridge'
import {
  storageGameUid, storageGameServer,
} from '~/logic/storage'

const UidInputEl = ref()
const ServerSelectEl = ref()

const refreshText = ref('')

const onCookieReadBtnClick = async() => {
  const ret = await sendMessage('refresh_cookie', {})
  // eslint-disable-next-line no-console
  if (ret) {
    refreshText.value = '刷新成功'
    sendMessage('force_refresh', {})
  }
  else { refreshText.value = '未找到用户凭据' }
  setTimeout(() => {
    refreshText.value = ''
  }, 2000)
}

</script>
<template>
  <main class="px-4 py-5">
    <div class="setting-panel">
      <h1>第一步 基本配置</h1>
      <div class="config-item">
        <p>请输入你的uid:</p>
        <input ref="UidInputEl" v-model="storageGameUid" type="text" />
      </div>
      <div class="config-item">
        <p>请选择你的服务器:</p>
        <select ref="ServerSelectEl" v-model="storageGameServer">
          <option value="0">
            官服
          </option>
          <option value="1">
            B服
          </option>
        </select>
      </div>
    </div>
    <div class="divider my-4"></div>
    <div class="cookie-refresh-panel">
      <h1>第二步 获取用户凭据</h1>
      <br />
      <p class="tips">
        拓展需要您的米游社用户凭据(cookies)才能够获取相关数据。
      </p>
      <p class="tips">
        别担心，这些数据均储存在本地，且不会提交到任何第三方服务器。
      </p>
      <p class="tips">
        点按下面的按钮之前，请确保您已经在此浏览器登录了
        <a href="https://bbs.mihoyo.com/ys" target="_blank">米游社</a>。
      </p>
      <div
        class="btn"
        @click="onCookieReadBtnClick"
      >
        {{ refreshText == '' ? '获取用户凭据' : refreshText }}
      </div>
    </div>
  </main>
</template>

<style lang="scss" scoped>
main {
  background: linear-gradient(to bottom, #141d2e 0%, #1e2f48 100%);
  @apply h-auto;
}

.btn {
  @apply text-lg rounded-md text-center select-none;
  @apply cursor-pointer transition-all transform-gpu;
  @apply px-2 py-1 m-2 mt-3;
  background: linear-gradient(60deg, #c6b5a2 0%, #e5dbc7 100%);
  color: #141d2e;

  &:hover {
    @apply opacity-90;
  }

  &:active {
    @apply scale-96 opacity-100;
  }
}

h1 {
  @apply text-xl select-none;
  color: #e6decc;
}

.tips {
  @apply text-sm select-none;
  color: #e6decc;
}

.divider {
  background: linear-gradient(60deg, #c6b5a2 0%, #e5dbc7 100%);
  @apply h-0.5 opacity-30 rounded-full;
}

a {
  @apply transition;
  color: #e6decc;
  text-decoration: underline dashed 1px #e6decc80;

  &:hover {
    @apply opacity-80;
  }
}

.setting-panel {
  .config-item {
    @apply m-2;
    p {
      @apply text-base mb-1 select-none;
      color: #e6decc;
    }

    input,
    select {
      @apply w-full;
      @apply text-lg rounded-md transition;
      @apply px-2 py-1;
      background: linear-gradient(60deg, #c6b5a2 0%, #e5dbc7 100%);
      color: #141d2e;

      &:focus {
        @apply shadow-lg shadow-[#e6decc];
      }
    }

    ::selection {
      background: #192741;
      color: #e6decc;
    }
  }
}
</style>
