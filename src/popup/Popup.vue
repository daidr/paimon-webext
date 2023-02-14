<script setup lang="ts">
import { sendMessage } from 'webext-bridge'
import { i18n } from 'webextension-polyfill'
import type { IUserDataItem } from '~/types'
import { calcRoleDataLocally, getClock, getTime } from '~/utils/utils'

const isLoaded = ref(false)

const userDataList = ref([] as IUserDataItem[])

const selectedUid = ref('')

const onSelectUidChange = (e: any) => {
  selectedUid.value = e.target.value || selectedUid.value
  sendMessage('set_selected_role', { uid: selectedUid.value })
}

const userData = computed(() => {
  const data = userDataList.value.find(
    (item) => item.uid === selectedUid.value,
  )
  return data ? calcRoleDataLocally(data) : ({} as IUserDataItem)
})

const updateUserInfo = async () => {
  userDataList.value = await sendMessage('get_role_list', {})
  selectedUid.value = await sendMessage('get_selected_role', {})
  isLoaded.value = true

  // 筛选出启用的角色列表
  userDataList.value = userDataList.value.filter((item) => item.isEnabled)

  if (userDataList.value.length > 0) {
    // 查看选中uid是否存在
    if (!userDataList.value.find((item) => item.uid === selectedUid.value)) {
      // 不存在
      selectedUid.value = userDataList.value[0].uid
    }
  }
}

const openOptionsPage = () => {
  browser.runtime.openOptionsPage()
}

const refreshRequestForce = async () => {
  await sendMessage('refresh_request_force', {})
  updateUserInfo()
}

const refreshRequest = async () => {
  await sendMessage('refresh_request', {})
  updateUserInfo()
}

onMounted(() => {
  updateUserInfo()
  refreshRequest()
})

setInterval(() => {
  updateUserInfo()
}, 10 * 1000)

const TimeComponent = (props: { time: { hour: number; minute: number } }) => {
  if (props.time.hour === 0) {
    return [
      h('span', { class: 'value' }, props.time.minute),
      h('span', { class: 'unit' }, i18n.getMessage('popup_recovery_minute')),
    ]
  }
  else {
    return [
      h('span', { class: 'value' }, props.time.hour),
      h('span', { class: 'unit' }, i18n.getMessage('popup_recovery_hour')),
      ' ',
      h('span', { class: 'value' }, props.time.minute),
      h('span', { class: 'unit' }, i18n.getMessage('popup_recovery_minute')),
    ]
  }
}

const DayComponent = (props: {
  time: { day: 'today' | 'tomorrow'; hour: string; minute: string }
}) => {
  return [
    h('span', { class: 'unit' }, i18n.getMessage(`popup_${props.time.day}`)),
    ' ',
    h('span', { class: 'value' }, props.time.hour),
    h('span', { class: 'unit' }, i18n.getMessage('popup_hour')),
    h('span', { class: 'value' }, props.time.minute),
    h('span', { class: 'unit' }, i18n.getMessage('popup_minute')),
  ]
}

const calcRecoveryTime = (time: {
  Day: number
  Hour: number
  Minute: number
  Second: number
}) => {
  if (time.Day > 0)
    return time.Day + i18n.getMessage('popup_recovery_day')
  else if (time.Hour > 0)
    return time.Hour + i18n.getMessage('popup_recovery_hour')
  else if (time.Minute > 0)
    return time.Minute + i18n.getMessage('popup_recovery_minute')
  else return time.Second + i18n.getMessage('popup_recovery_second')
}

const showCaptchaContainer = ref(false)

const openCaptcha = async () => {
  await sendMessage('request_captcha_bg', { uid: selectedUid.value })
}
</script>

<template>
  <div
    v-if="showCaptchaContainer"
    id="captcha-container"
    class="captcha-container"
  />
  <main v-if="isLoaded" class="w-[350px] px-4 pt-4 pb-3">
    <div v-if="Object.keys(userData).length > 0" class="main-wrapper">
      <div class="stat-item-1">
        <div class="left">
          <p>
            {{ i18n.getMessage("popup_CurrentTitle") }}
            <select @change="onSelectUidChange">
              <option
                v-for="item in userDataList"
                :key="item.uid"
                :value="item.uid"
                :selected="item.uid === selectedUid"
              >
                {{ item.nickname }}({{ item.uid }})
              </option>
            </select>
          </p>
          <p>
            {{ i18n.getMessage("popup_ServerTitle")
            }}{{ i18n.getMessage(userData.serverRegion) }}
          </p>
        </div>
        <div class="right">
          <uil:setting @click="openOptionsPage" />
        </div>
      </div>
      <template v-if="!userData.isError">
        <div class="resin-stats">
          <h2>
            <span class="resin-title">
              <img src="/assets/genshin/resin.png">
              {{ i18n.getMessage("popup_ResinTitle") }}</span>
            <span class="update-time">{{ i18n.getMessage("popup_UpdateTimeTitle")
            }}{{ new Date(userData.updateTimestamp).toLocaleString() }}</span>
          </h2>
          <p class="resin-num">
            {{ userData.data.current_resin }}/{{ userData.data.max_resin }}
          </p>
          <template
            v-if="userData.data.current_resin < userData.data.max_resin"
          >
            <p class="sub-stat-item">
              <span class="left">
                <uil:hourglass />
                {{ i18n.getMessage("popup_FullyReplenishedTitle") }}
              </span>
              <span class="right">
                <TimeComponent
                  :time="getTime(Number(userData.data.resin_recovery_time))"
                />
              </span>
            </p>
            <p class="sub-stat-item">
              <span class="left">
                <uil:clock-two /> {{ i18n.getMessage("popup_ETATitle") }}
              </span>
              <span class="right">
                <DayComponent
                  :time="getClock(Number(userData.data.resin_recovery_time))"
                />
              </span>
            </p>
          </template>
        </div>
        <div class="divider" />
        <div class="expeditions-stats">
          <h2 :class="{ 'has-result': userData.data.expeditions.length > 0 }">
            {{ i18n.getMessage("popup_ExpeditionsTitle") }}
            {{ userData.data.current_expedition_num }}/{{
              userData.data.max_expedition_num
            }}
          </h2>
          <template v-if="userData.data.expeditions.length > 0">
            <div
              v-for="(expedition, index) of userData.data.expeditions"
              :key="index"
              class="expedition-item"
            >
              <span class="left">
                <img :src="expedition.avatar_side_icon">
                {{
                  expedition.status === "Ongoing"
                    ? i18n.getMessage("popup_ExploringStatus")
                    : i18n.getMessage("popup_FinishedStatus")
                }}
              </span>
              <span v-if="expedition.remained_time === '0'" class="right">-</span>
              <span v-else class="right">
                <TimeComponent
                  :time="getTime(Number(expedition.remained_time))"
                />
              </span>
            </div>
          </template>
        </div>
        <div class="divider" />
        <div class="more-stats">
          <div class="stat-item">
            <span class="left">
              <img src="/assets/genshin/task.png">
              {{ i18n.getMessage("popup_DailyCommissionsTitle") }}
            </span>
            <span class="right">{{ userData.data.finished_task_num }}/{{
              userData.data.total_task_num
            }}
              <span
                v-if="
                  userData.data.finished_task_num
                    === userData.data.total_task_num
                "
              >
                {{
                  userData.data.is_extra_task_reward_received
                    ? i18n.getMessage("popup_ExtraTaskReceived")
                    : i18n.getMessage("popup_ExtraTaskNotReceived")
                }}
              </span>
            </span>
          </div>
          <div class="stat-item">
            <span class="left">
              <img src="/assets/genshin/home.png">
              {{ i18n.getMessage("popup_RealmCurrencyTitle") }}
            </span>
            <span class="right">{{ userData.data.current_home_coin }}/{{
              userData.data.max_home_coin
            }}</span>
          </div>
          <div class="stat-item">
            <span class="left">
              <img src="/assets/genshin/discount.png">
              {{ i18n.getMessage("popup_WeeklyBossesTitle") }}
            </span>
            <span class="right">{{
              userData.data.resin_discount_num_limit
                - userData.data.remain_resin_discount_num
            }}/{{ userData.data.resin_discount_num_limit }}</span>
          </div>
          <div
            v-if="
              userData.data.transformer && userData.data.transformer.obtained
            "
            class="stat-item"
          >
            <span class="left">
              <img src="/assets/genshin/transformer.png">
              {{ i18n.getMessage("popup_ParametricTransformerTitle") }}
            </span>
            <span class="right">{{
              userData.data.transformer.recovery_time.reached
                ? i18n.getMessage("popup_Available")
                : calcRecoveryTime(userData.data.transformer.recovery_time)
            }}</span>
          </div>
        </div>
      </template>
    </div>
    <div v-if="Object.keys(userData).length === 0">
      <h1 class="mb-4">
        {{ i18n.getMessage("popup_ConfigurationTitle") }}
      </h1>
      <p class="tips">
        {{ i18n.getMessage("popup_ConfigurationTips") }}
      </p>
      <div class="btn" @click="openOptionsPage">
        {{ i18n.getMessage("popup_ConfigurationButtonText") }}
      </div>
    </div>
    <div v-if="Object.keys(userData).length > 0 && userData.isError">
      <h1 class="my-4">
        {{ i18n.getMessage("popup_ErrorTitle") }}
      </h1>
      <p class="tips">
        <template v-if="userData.errorMessage === '触发风控'">
          {{ i18n.getMessage("popup_ErrorTips_5") }}
          <ol>
            <li>{{ i18n.getMessage("popup_ErrorTips_7") }}</li>
          </ol>
        </template>
        <template v-else>
          {{ i18n.getMessage("popup_ErrorTips_1") }}
          <ol>
            <li>{{ i18n.getMessage("popup_ErrorTips_2") }}</li>
            <li>{{ i18n.getMessage("popup_ErrorTips_3") }}</li>
            <li>{{ i18n.getMessage("popup_ErrorTips_4") }}</li>
          </ol>
        </template>
      </p>
      <template v-if="userData.errorMessage === '触发风控'">
        <div class="btn" @click="openCaptcha">
          {{ i18n.getMessage("popup_CaptchaButtonText") }}
        </div>
      </template>
      <template v-else>
        <div class="btn" @click="openOptionsPage">
          {{ i18n.getMessage("popup_ErrorOpenConfigButtonText") }}
        </div>
        <div class="btn" @click="refreshRequestForce">
          {{ i18n.getMessage("popup_ErrorRefreshButtonText") }}
        </div>
      </template>
    </div>
  </main>
</template>

<style lang="scss">
  @font-face {
    font-family: number-mono;
    src: local(ui-monospace), local(SFMono-Regular), local(Menlo), local(Monaco),
      local(Consolas), local("Liberation Mono"), local("Courier New"),
      local(monospace);
    unicode-range: U+30-39, U+2F, U+3A;
  }

  .unit {
    @apply text-xs;
    @apply mx-0.3;
  }

  .value {
    @apply text-base;
  }

  img {
    @apply pointer-events-none;
  }
</style>

<style lang="scss" scoped>
  .captcha-container {
    @apply fixed;
    @apply top-0 left-0 right-0 bottom-0 z-99;
  }

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
    @apply text-sm mb-1;
    color: #e6decc;

    ol {
      @apply my-2;

      li {
        @apply my-1 ml-5 list-square;
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
      }

      ::selection {
        background: #192741;
        color: #e6decc;
      }
    }
  }

  .main-wrapper {
    @apply flex flex-col gap-y-2;

    .stat-item-1 {
      @apply rounded-md px-2 py-1 select-none;
      @apply flex justify-between items-center;
      background: linear-gradient(60deg, #c6b5a2 0%, #e5dbc7 100%);
      color: #141d2e;

      select {
        @apply bg-transparent cursor-pointer;
        @apply rounded-md;
        @apply transition-all;
        @apply px-0 ml-0;
        @apply py-0.5;
        @apply text-primary-dark;

        &:hover {
          @apply bg-[#fcf6e480];
          @apply px-1 ml-1;
        }
      }

      .left {
        @apply text-sm;
      }

      .right {
        @apply text-xl;
        @apply flex items-center;

        svg {
          @apply cursor-pointer transition transform-gpu;

          &:hover {
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
        @apply text-sm tracking-widest flex items-center justify-between gap-x-2 opacity-90;

        img {
          @apply h-4 w-4;
        }

        .resin-title {
          @apply text-ellipsis flex-shrink overflow-hidden whitespace-nowrap h-full;
          @apply flex items-center gap-x-2;
        }

        .update-time {
          @apply text-primary-light/40 select-none;
          @apply text-right text-xs;
          @apply transition-all overflow-hidden;
          @apply max-w-0 whitespace-nowrap opacity-0 duration-600;
          @apply flex-shrink-0;
        }

        &:hover {
          .update-time {
            @apply max-w-full opacity-100;
          }
        }
      }

      .resin-num {
        @apply text-4xl tracking-wider font-bold mt-1 mb-1.5;
        font-family: number-mono;
      }

      .sub-stat-item {
        @apply text-sm;
        @apply flex justify-between items-center mt-1;

        .left {
          @apply flex items-center gap-x-1 tracking-widest;
        }

        .right {
          @apply opacity-60 font-bold;
          font-family: number-mono;
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
          @apply mb-1;
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
          @apply font-bold text-sm opacity-60;
          font-family: number-mono;
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
          @apply font-bold text-sm opacity-60;
          @apply text-right;
          font-family: number-mono;
        }
      }
    }
  }
</style>
