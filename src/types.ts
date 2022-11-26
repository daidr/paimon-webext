export type ServerTypes = 'cn' | 'os'
export type serverRegions = 'cn_gf01' | 'cn_qd01' | 'os_usa' | 'os_euro' | 'os_asia' | 'os_cht'

export interface IUserData {
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

export interface IAlertSetting {
  /**
   * 树脂
   */
  resin: boolean
  /**
   * 树脂阈值（默认 155）
   */
  resinThreshold: number
  /**
   * 参量质变仪
   */
  transformer: boolean
  /**
   * 洞天宝钱
   */
  realmCurrency: boolean
}

/**
* 当前提醒的通知 ID
*/
export interface IAlertStatus {
  /**
   * 树脂
   */
  resin: string
  /**
   * 参量质变仪
   */
  transformer: string
  /**
   * 洞天宝钱
   */
  realmCurrency: string
}

export interface IUserDataItem {
  /**
   * 是否启用（不启用则不显示，且不获取数据）
   */
  isEnabled: boolean
  /**
   * 是否开启提示功能（默认关闭）
   */
  enabledAlert: boolean
  /**
   * 周期内是否提醒过
   */
  alertStatus: IAlertStatus
  /**
   * 服务器类型（国服/海外）
   */
  serverType: ServerTypes
  /**
   * 细分的服务器类型
   */
  serverRegion: serverRegions
  /**
   * 玩家id
   */
  uid: string
  /**
   * 玩家昵称
   */
  nickname: string
  /**
   * 玩家昵称
   */
  level: number
  /**
   * 用户cookie
   */
  cookie: string
  /**
   * 获取的数据
   */
  data: IUserData
  /**
   * 最后一次获取数据的时间
   */
  updateTimestamp: number
  /**
   * 是否出错
   */
  isError?: boolean
  /**
   * 错误信息
   */
  errorMessage?: string
}

export interface IRoleDataItem {
  /**
   * 玩家对应的服务器
   */
  region: serverRegions
  /**
   * 玩家对应的服务器名称
   */
  region_name: string
  /**
   * 玩家uid
   */
  game_uid: string
  /**
   * 玩家昵称
   */
  nickname: string
  /**
   * 玩家等级
   */
  level: number
}

export interface ICaptchaResponse {
  gt: string
  challenge: string
  new_captcha: boolean | number
}

export interface ICaptchaRequest {
  geetest_challenge: string
  geetest_seccode: string
  geetest_validate: string
}

export interface ISettingsMap {
  refreshInterval: number
  badgeVisibility: boolean
}
