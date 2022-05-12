<script setup lang="ts">
import { sendMessage } from 'webext-bridge'
import { i18n } from 'webextension-polyfill'
import { IUserDataItem } from '~/types'

const ServerSelectEl = ref()
const ServerSelectValue = ref('0')

const refreshText = ref('')

const activeNavItem = ref(0)

const manifestData = ref({})

fetch('/manifest.json')
  .then((response) => response.json())
  .then((data) => {
    manifestData.value = data
  })

// 当切换到 角色列表&设置 时，尝试获取角色列表
const roleList = ref([] as IUserDataItem[])
watch(activeNavItem, (newValue) => {
  if (newValue === 1) {
    sendMessage('get_role_list', {}).then((data) => {
      roleList.value = (data as unknown) as IUserDataItem[]
    })
  }
})

const isFetching = ref(false)

const onCookieReadBtnClick = () => {
  isFetching.value = true
  sendMessage<number, 'request_cookie_read'>('request_cookie_read', {
    oversea: ServerSelectValue.value === '1',
  }).then((data) => {
    isFetching.value = false
    refreshText.value = ''
    if (data > 0) {
      // 用户凭据获取成功
      refreshText.value = i18n.getMessage('options_FetchBtnAlert_2', [data])
    } else if (data === 0) {
      // 用户凭据没有角色
      refreshText.value = i18n.getMessage('options_FetchBtnAlert_3')
    } else {
      // 用户凭据获取失败
      refreshText.value = i18n.getMessage('options_FetchBtnAlert_1')
    }
    setTimeout(() => {
      refreshText.value = ''
    }, 2000)
  })
}

const onDeleteRoleBtnClick = (roleUid: string) => {
  sendMessage('delete_role_request', {
    uid: roleUid,
  }).then(() => {
    sendMessage('get_role_list', {}).then((data) => {
      roleList.value = (data as unknown) as IUserDataItem[]
    })
  })
}

const onRoleCheckboxChange = (roleUid: string, e: any) => {
  sendMessage('set_role_status', {
    uid: roleUid,
    status: e.target.checked,
  })
}
</script>

<template>
  <main class="px-4 py-5">
    <nav>
      <div :class="{ active: activeNavItem == 0 }" @click="activeNavItem = 0">
        {{ i18n.getMessage('options_Nav_AddNewRole') }}
      </div>
      <div :class="{ active: activeNavItem == 1 }" @click="activeNavItem = 1">
        {{ i18n.getMessage('options_Nav_RoleListSetting') }}
      </div>
      <div :class="{ active: activeNavItem == 2 }" @click="activeNavItem = 2">
        {{ i18n.getMessage('options_Nav_About') }}
      </div>
    </nav>
    <template v-if="activeNavItem == 0">
      <div class="setting-panel add-panel">
        <h1>{{ i18n.getMessage('options_SelectServer') }}</h1>
        <div class="config-item">
          <select ref="ServerSelectEl" v-model="ServerSelectValue">
            <option value="0">
              {{ i18n.getMessage('options_ServerCN') }}
            </option>
            <option value="1">
              {{ i18n.getMessage('options_ServerOS') }}
            </option>
          </select>
        </div>
      </div>
      <div class="divider my-4"></div>
      <div class="cookie-refresh-panel">
        <h1>{{ i18n.getMessage('options_FetchUserCookie') }}</h1>
        <p class="tips" v-html="i18n.getMessage('options_Tips_1')"></p>
        <p class="tips" v-html="i18n.getMessage('options_Tips_2')"></p>
        <p
          class="tips"
          v-html="
            ServerSelectValue == '0'
              ? i18n.getMessage('options_Tips_3')
              : i18n.getMessage('options_Tips_4')
          "
        ></p>
        <div
          class="btn"
          :class="{ 'is-fetching': isFetching }"
          @click="onCookieReadBtnClick"
        >
          {{
            refreshText == ''
              ? i18n.getMessage('options_FetchBtnTitle')
              : refreshText
          }}
        </div>
      </div>
    </template>
    <template v-if="activeNavItem == 1">
      <div class="setting-panel role-panel">
        <template v-if="!roleList || roleList.length == 0">
          <div class="role-not-found">
            {{ i18n.getMessage('options_Role_NoRoleFound') }}
          </div>
        </template>
        <template v-else>
          <div class="role-list">
            <table class="role-table">
              <thead>
                <tr>
                  <th>{{ i18n.getMessage('options_Role_IsEnabledTitle') }}</th>
                  <th>{{ i18n.getMessage('options_Role_RoleNameTitle') }}</th>
                  <th>{{ i18n.getMessage('options_Role_RoleServerTitle') }}</th>
                  <th>{{ i18n.getMessage('options_Role_RoleActionTitle') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(role, index) in roleList" :key="role.uid">
                  <td>
                    <input
                      :id="`role-checkbox-${index}`"
                      type="checkbox"
                      :checked="role.isEnabled"
                      @change="onRoleCheckboxChange(role.uid, $event)"
                    />
                    <label :for="`role-checkbox-${index}`"></label>
                  </td>
                  <td>{{ role.nickname }}({{ role.uid }})</td>
                  <td>{{ i18n.getMessage(role.serverRegion) }}</td>
                  <td>
                    <div
                      class="delete-role-btn"
                      @click="onDeleteRoleBtnClick(role.uid)"
                    >
                      <uil:multiply />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </template>
    <template v-if="activeNavItem == 2">
      <div class="setting-panel about-panel">
        <table class="about-table">
          <tbody>
            <tr>
              <td class="key">
                {{ i18n.getMessage('options_About_VersionTitle') }}
              </td>
              <td class="value" v-html="manifestData.version"></td>
            </tr>
            <tr>
              <td class="key">
                {{ i18n.getMessage('options_About_AuthorTitle') }}
              </td>
              <td
                class="value"
                v-html="i18n.getMessage('options_About_Author')"
              ></td>
            </tr>
            <tr>
              <td class="key">
                {{ i18n.getMessage('options_About_OpenSourceTitle') }}
              </td>
              <td
                class="value"
                v-html="i18n.getMessage('options_About_OpenSource')"
              ></td>
            </tr>
            <tr>
              <td class="key">
                {{ i18n.getMessage('options_About_ThankTitle') }}
              </td>
              <td
                class="value"
                v-html="i18n.getMessage('options_About_Thank')"
              ></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </main>
</template>

<style lang="scss">
a {
  @apply transition;
  @apply text-primary-light;
  @apply border-dashed border-b-1 border-primary-light/80;

  &:hover {
    @apply opacity-80;
  }

  &.reverse {
    @apply border-dashed border-b-1 border-primary-dark text-primary-dark;
  }
}

::selection {
  @apply text-primary-light bg-primary-dark;
}
</style>

<style lang="scss" scoped>
nav {
  @apply flex mb-4 gap-x-2;
  @apply select-none;

  div {
    @apply px-3 py-2;
    @apply rounded-md text-base;
    @apply cursor-pointer;
    @apply transition-all;
    @apply text-primary-light bg-transparent;

    &:hover {
      @apply bg-primary-light/70;
      @apply text-primary-dark;
    }

    &.active {
      @apply cursor-default;
      @apply bg-primary-light bg-opacity-100;
      @apply text-primary-dark;
    }
  }
}

main {
  background: linear-gradient(to bottom, #141d2e 0%, #1e2f48 100%);
  @apply min-h-screen;
}

.btn {
  @apply text-lg rounded-md text-center select-none;
  @apply cursor-pointer transition-all transform-gpu;
  @apply px-2 py-1 m-2 mt-3;
  @apply text-primary-dark;

  background: linear-gradient(60deg, #c6b5a2 0%, #e5dbc7 100%);

  &:hover {
    @apply opacity-90;
  }

  &:active {
    @apply scale-96 opacity-100;
  }

  &.is-fetching {
    @apply opacity-50;
    @apply pointer-events-none;
  }
}

h1 {
  @apply text-xl select-none mb-2;
  @apply text-primary-light;
}

.tips {
  @apply text-sm select-none mx-2;
  @apply text-primary-light;
}

.divider {
  background: linear-gradient(60deg, #c6b5a2 0%, #e5dbc7 100%);
  @apply h-0.5 opacity-30 rounded-full;
}

.setting-panel {
  .config-item {
    @apply m-2;

    p {
      @apply text-base mb-1 select-none;
      @apply text-primary-light;
    }

    input,
    select {
      @apply w-full;
      @apply text-lg rounded-md transition;
      @apply px-2 py-1;
      background: linear-gradient(60deg, #c6b5a2 0%, #e5dbc7 100%);
      @apply text-primary-dark;

      &:focus {
        @apply shadow-lg shadow-[#e6decc];
      }
    }

    select {
      @apply select-none;
    }
  }
}

.role-panel {
  .role-not-found {
    @apply text-lg text-primary-light text-center;
    @apply select-none;
  }

  .role-list {
    @apply text-base text-primary-dark text-center;

    .role-table {
      @apply w-full border-separate;

      border-spacing: 0px 5px;

      tr {
        background: linear-gradient(60deg, #c6b5a2 0%, #e5dbc7 100%);
      }

      th {
        @apply select-none;
      }

      td:first-of-type,
      th:first-of-type {
        @apply rounded-l-md;
      }

      td:last-of-type,
      th:last-of-type {
        @apply rounded-r-md;
      }

      .delete-role-btn {
        @apply text-primary-dark;
        @apply flex justify-center items-start;
        @apply text-base;
        @apply w-full h-full;
        @apply cursor-pointer;

        svg {
          @apply p-0.5 rounded-full;
          @apply transition;
        }

        &:hover {
          svg {
            @apply bg-red-700 text-white;
          }
        }

        &:active {
          svg {
            @apply opacity-70;
          }
        }
      }
    }
  }
}

.about-panel {
  .about-table {
    @apply text-primary-dark text-base;
    @apply w-full border-separate;
    border-spacing: 8px;

    .key {
      @apply table-caption;
      @apply font-bold;
      @apply w-100px;
      @apply select-none;
    }

    .key,
    .value {
      @apply p-2 rounded-md whitespace-pre-wrap;
      background: linear-gradient(60deg, #c6b5a2 0%, #e5dbc7 100%);
    }
  }
}
</style>
