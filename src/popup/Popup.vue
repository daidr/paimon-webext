<script setup lang="ts">
import {
  storageGameUid, storageGameServer, storageCookies, storageErrorMessage,
  storageUserData,
} from '~/logic/storage'
import { getTime, getClock } from '~/utils.js'

const SERVER_LIST = ['官服', 'B服']

interface userDataType {
  current_resin: number
  max_resin: number
  resin_recovery_time: string
  finished_task_num: number
  total_task_num: number
  is_extra_task_reward_received: boolean
  remain_resin_discount_num: number
  resin_discount_num_limit: number
  current_expedition_num: number
  max_expedition_num: number
  expeditions: {
    avatar_side_icon: string
    status: string
    remained_time: string
  }[]
  current_home_coin: number
  max_home_coin: number
  home_coin_recovery_time: string
  transformer: {
    obtained: boolean
    recovery_time: {
      Day: number
      Hour: number
      Minute: number
      Second: number
      reached: boolean
    }
  }

}
const isError = ref(false)
const userData = ref({} as userDataType)

const updateUserInfo = () => {
  if (storageErrorMessage.value !== '')
    isError.value = true
  else
    userData.value = JSON.parse(storageUserData.value)
}

setTimeout(() => { updateUserInfo() }, 10)

setInterval(() => { updateUserInfo() }, 10 * 1000)
const uid = computed(() => storageGameUid.value)
const server = computed(() => SERVER_LIST[Number(storageGameServer.value)])

const openOptionsPage = () => {
  browser.runtime.openOptionsPage()
}
</script>

<template>
  <main class="w-[300px] px-4 py-5">
    <div
      v-if="!isError && storageUserData && storageCookies != '' && storageGameUid != '' && ['0', '1'].includes(storageGameServer)"
      class="main-wrapper"
    >
      <div class="stat-item-1">
        <div class="left">
          <p>uid: {{ uid }}</p>
          <p>服务器: {{ server }}</p>
        </div>
        <div class="right">
          <uil:setting @click="openOptionsPage" />
        </div>
      </div>
      <div class="resin-stats">
        <h2>
          <img src="/assets/genshin/resin.png" /> 原粹树脂
        </h2>
        <p class="resin-num">
          {{ userData.current_resin }}/{{ userData.max_resin }}
        </p>
        <template v-if="userData.current_resin != userData.max_resin">
          <p class="sub-stat-item">
            <span class="left">
              <uil:hourglass />全部恢复需要：
            </span>
            <span class="right">{{ getTime(userData.resin_recovery_time) }}</span>
          </p>
          <p class="sub-stat-item">
            <span class="left">
              <uil:clock-two />预计恢复时间：
            </span>
            <span class="right">{{ getClock(userData.resin_recovery_time) }}</span>
          </p>
        </template>
      </div>
      <div class="divider"></div>
      <div class="expeditions-stats">
        <h2 :class="{ 'has-result': userData.expeditions.length > 0 }">
          探索派遣 {{ userData.current_expedition_num }}/{{ userData.max_expedition_num }}
        </h2>
        <template v-if="userData.expeditions.length > 0">
          <div v-for="expedition, index of userData.expeditions" :key="index" class="expedition-item">
            <span class="left">
              <img :src="expedition.avatar_side_icon" />
              {{ expedition.status == 'Ongoing' ? '探索中' : '已完成' }}
            </span>
            <span class="right">{{ expedition.remained_time == '0' ? '-' : getTime(expedition.remained_time) }}</span>
          </div>
        </template>
      </div>
      <div class="divider"></div>
      <div class="more-stats">
        <div class="stat-item">
          <span class="left">
            <img src="/assets/genshin/task.png" /> 每日委托
          </span>
          <span class="right">{{ userData.finished_task_num }}/{{ userData.total_task_num }}</span>
        </div>
        <div class="stat-item">
          <span class="left">
            <img src="/assets/genshin/home.png" /> 洞天宝钱
          </span>
          <span class="right">{{ userData.current_home_coin }}/{{ userData.max_home_coin }}</span>
        </div>
        <div class="stat-item">
          <span class="left">
            <img src="/assets/genshin/discount.png" /> 周本树脂五折
          </span>
          <span class="right">{{ userData.remain_resin_discount_num }}/{{ userData.resin_discount_num_limit }}</span>
        </div>
        <div v-if="userData.transformer.obtained" class="stat-item">
          <span class="left">
            <img src="/assets/genshin/transformer.png" /> 参量质变仪
          </span>
          <span class="right">{{
            userData.transformer.recovery_time.reached ? '可用' :
            `${userData.transformer.recovery_time.Day}天`
          }}</span>
        </div>
      </div>
    </div>
    <div v-else-if="!isError">
      <h1 class="mb-4">
        配置
      </h1>
      <p class="tips">
        您需要进行一些简单的配置，完成后便可以正常使用啦！
      </p>
      <div class="btn" @click="openOptionsPage">
        打开配置页面
      </div>
    </div>
    <div v-else-if="isError">
      <h1 class="mb-4">
        发生错误
      </h1>
      <p class="tips">
        拓展无法获取您的游戏数据，试试前往设置页面检查下面的配置是否正确。
        <ol>
          <li>uid/服务器配置 是否配置正确</li>
          <li>用户凭据 是否配置正确(浏览器米游社是否登录)</li>
        </ol>
      </p>
      <div class="btn" @click="openOptionsPage">
        打开配置页面
      </div>
    </div>
  </main>
</template>

<style lang="scss" scoped>
main {
  background: linear-gradient(to bottom, #141d2e 0%, #1e2f48 100%);
}

.btn {
  @apply text-lg rounded-md text-center select-none;
  @apply cursor-pointer transition-all transform-gpu;
  @apply px-2 py-1 m-2 mt-6;
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
  @apply text-xl;
  color: #e6decc;
}

.tips {
  @apply text-xs mb-1;
  color: #e6decc;

  ol {
    @apply my-2;

    li {
      @apply my-1;
      @apply li;
    }
  }
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
      @apply text-base mb-1;
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

.main-wrapper {
  @apply flex flex-col gap-y-3;
  .stat-item-1 {
    @apply rounded-md px-2 py-2 select-none;
    @apply flex justify-between items-center;
    background: linear-gradient(60deg, #c6b5a2 0%, #e5dbc7 100%);
    color: #141d2e;

    .right {
      @apply text-xl;
      @apply flex item-center;

      svg {
        @apply cursor-pointer transition transform-gpu;
        &:hover{
          @apply opacity-70;
        }
        &:active {
          @apply scale-95;
        }
      }
    }
  }

  .resin-stats {
    @apply select-none;
    color: #e6decc;

    h2 {
      @apply text-sm tracking-widest flex items-center gap-x-2 opacity-90;
      img {
        @apply h-4 w-4;
      }
    }

    .resin-num {
      @apply text-4xl tracking-wider font-mono font-bold mt-2;
    }

    .sub-stat-item {
      @apply text-sm;
      @apply flex justify-between items-center mt-2;

      .left {
        @apply flex items-center gap-x-1 tracking-widest;
      }

      .right {
        @apply opacity-60 font-bold font-mono;
      }
    }
  }

  .expeditions-stats {
    @apply select-none;
    color: #e6decc;
    @apply flex flex-col gap-y-2;

    h2 {
      @apply text-sm tracking-widest flex items-center gap-x-2 opacity-90;

      &.has-result {
        @apply mb-2;
      }
    }

    .expedition-item {
      @apply flex items-center justify-between;
      img {
        @apply h-7 w-7;
        @apply rounded-full overflow-hidden border border-2 border-[#e6decccc];
      }

      .left {
        @apply flex items-center gap-x-2;
        @apply text-sm tracking-widest;
      }

      .right {
        @apply font-bold text-sm opacity-60 font-mono;
      }
    }
  }

  .more-stats {
    @apply flex flex-col;
    @apply select-none;

    .stat-item {
      @apply flex items-center justify-between;
      color: #e6decc;
      @apply text-sm;

      .left {
        @apply flex items-center gap-x-2 tracking-widest;
        img {
          @apply h-7 w-7;
        }
      }

      .right {
        @apply font-bold text-sm opacity-60 font-mono;
      }
    }
  }
}
</style>
