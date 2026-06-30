import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, Text, View } from "@tarojs/components";
import Taro, { useDidShow, usePullDownRefresh } from "@tarojs/taro";
import EmptyState from "@/components/empty-state";
import InputDialog from "@/components/input-dialog";
import MiniProgramTopSpacer from "@/components/mini-program-top-spacer";
import Pressable from "@/components/pressable";
import TabBarPlus from "@/components/tab-bar-plus";
import SectionCard from "@/components/section-card";
import { SkeletonCard } from "@/components/skeleton";
import StatusChip from "@/components/status-chip";
import WorkspaceSwitcher from "@/components/workspace-switcher";
import { orderStatusMetaMap } from "@/constants/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useTaskStore } from "@/stores/useTaskStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { redirectToWorkspaceEntry } from "@/utils/auth";
import { showErrorToast } from "@/utils/error";
import type { TaskStatus } from "@shared/types";

type HomeDialogMode = "create" | "join" | null;

const taskCardToneClassMap: Record<TaskStatus, string> = {
  created: "feature-list-card--warning",
  accepted: "feature-list-card--info",
  rejected: "feature-list-card--danger",
  cooking: "feature-list-card--accent",
  completed: "feature-list-card--success",
  confirmed: "feature-list-card--success",
  cancelled: "feature-list-card--neutral",
  expired: "feature-list-card--danger",
};

const STATUS_BADGES = [
  { key: "created" as TaskStatus, label: "待响应", short: "01" },
  { key: "accepted" as TaskStatus, label: "已接单", short: "02" },
  { key: "cooking" as TaskStatus, label: "制作中", short: "03" },
  { key: "completed" as TaskStatus, label: "待确认", short: "04" },
];

const isH5 = process.env.TARO_ENV === "h5";

export default function Index() {
  // ── Stores ──
  const isLoggedIn = useAuthStore((s) => !!s.token);
  const ensureAuth = useAuthStore((s) => s.wxLogin);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore(
    (s) => s.activeWorkspaceId
  );
  const loading = useWorkspaceStore((s) => s.loading);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);
  const switchWorkspace = useWorkspaceStore((s) => s.switchWorkspace);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const tasks = useTaskStore((s) => s.tasks);
  const tasksLoading = useTaskStore((s) => s.tasksMeta.loading);
  const refreshTasks = useTaskStore((s) => s.refreshTasks);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const loadNotifications = useNotificationStore(
    (s) => s.loadNotifications
  );

  // ── Local UI ──
  const [dialogMode, setDialogMode] = useState<HomeDialogMode>(null);
  const [dialogValue, setDialogValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lastLoadTimeRef = useRef(0);

  // ── Derived ──
  const currentWorkspace = activeWorkspace();
  const workspacesForSwitcher = useMemo(
    () => workspaces.map((w) => ({ id: w.id, name: w.name })),
    [workspaces]
  );

  const recentTasks = useMemo(() => tasks.slice(0, 4), [tasks]);

  // 各状态任务计数
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_BADGES.forEach((b) => {
      counts[b.key] = tasks.filter((t) => t.status === b.key).length;
    });
    return counts;
  }, [tasks]);

  const pendingTotal = useMemo(
    () =>
      tasks.filter((t) =>
        (
          [
            "created",
            "accepted",
            "cooking",
            "completed",
          ] as TaskStatus[]
        ).includes(t.status as TaskStatus)
      ).length,
    [tasks]
  );

  // ── 加载 ──
  const loadDashboard = useCallback(async (forceRefresh = false) => {
    lastLoadTimeRef.current = Date.now();
    try {
      await loadWorkspaces(forceRefresh);
      const currentWorkspaces =
        useWorkspaceStore.getState().workspaces;
      const wsId = useWorkspaceStore.getState().activeWorkspaceId;
      if (currentWorkspaces.length === 0 || !wsId) {
        redirectToWorkspaceEntry();
        return;
      }
      await loadNotifications();
      await refreshTasks({ mine: true }, forceRefresh);
    } catch (error) {
      showErrorToast(error, "首页加载失败");
    }
  }, [loadWorkspaces, loadNotifications, refreshTasks]);

  const ensureLoginAndLoad = useCallback(async () => {
    if (isLoggedIn) {
      loadDashboard();
      return;
    }
    try {
      await ensureAuth();
      loadDashboard();
    } catch {
      /* handled */
    }
  }, [ensureAuth, isLoggedIn, loadDashboard]);

  useEffect(() => {
    ensureLoginAndLoad();
  }, [ensureLoginAndLoad]);

  useDidShow(() => {
    if (isLoggedIn && lastLoadTimeRef.current > 0) {
      loadDashboard(true);
    }
  });

  usePullDownRefresh(async () => {
    try {
      await loadDashboard(true);
    } finally {
      Taro.stopPullDownRefresh();
    }
  });

  // ── 交互 ──
  const handleSelectWorkspace = async (id: number) => {
    try {
      await switchWorkspace(id);
    } catch (e) {
      showErrorToast(e, "切换空间失败");
    }
  };

  const handleTaskClick = (task: { id: number }) => {
    Taro.navigateTo({ url: `/pages/task/index?id=${task.id}` });
  };

  const handleStatusFilter = (statusKey: TaskStatus) => {
    Taro.navigateTo({
      url: `/pages/task-list/index?filter=${statusKey}`,
    });
  };

  const handleViewAllTasks = () => {
    Taro.navigateTo({ url: "/pages/task-list/index" });
  };

  const handleCreateWorkspace = async () => {
    const name = dialogValue.trim();
    if (!name) {
      Taro.showToast({ title: "请输入空间名", icon: "none" });
      return;
    }
    setSubmitting(true);
    try {
      const { workspaceApi } = await import(
        "@/services/workspace.api"
      );
      await workspaceApi.create(name);
      setDialogValue("");
      setDialogMode(null);
      Taro.showToast({ title: "创建成功", icon: "success" });
      await loadDashboard();
    } catch (e) {
      showErrorToast(e, "创建空间失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinWorkspace = async () => {
    const code = dialogValue.trim().toUpperCase();
    if (!code) {
      Taro.showToast({ title: "请输入邀请码", icon: "none" });
      return;
    }
    setSubmitting(true);
    try {
      const { workspaceApi } = await import(
        "@/services/workspace.api"
      );
      const m = await workspaceApi.joinByInvite(code);
      const wsId =
        (m as { workspace?: { id: number } })?.workspace?.id || 0;
      if (wsId) {
        setDialogValue("");
        setDialogMode(null);
        Taro.showToast({ title: "加入成功", icon: "success" });
        await loadDashboard();
      }
    } catch (e) {
      showErrorToast(e, "加入空间失败");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──
  const isLoading = loading || (tasksLoading && tasks.length === 0);

  return (
    <View className="page-shell page-shell--dashboard">
      {process.env.TARO_ENV !== "h5" && (
        <View className="page-shell-top-spacer-extra" />
      )}
      <MiniProgramTopSpacer />

      {/* 顶部栏：空间切换 + 通知 */}
      <View className="toolbar-row dashboard-toolbar">
        <View className="toolbar-row__main">
          <WorkspaceSwitcher
            workspaces={workspacesForSwitcher}
            selectedWorkspaceId={activeWorkspaceId}
            onSelect={handleSelectWorkspace}
            onEdit={(ws) =>
              Taro.navigateTo({
                url: `/pages/group/index?workspaceId=${ws.id}`,
              })
            }
            onCreate={() => {
              setDialogValue("");
              setDialogMode("create");
            }}
            onJoin={() => {
              setDialogValue("");
              setDialogMode("join");
            }}
          />
        </View>
        <Pressable
          onClick={() =>
            Taro.navigateTo({ url: "/pages/notifications/index" })
          }>
          <View
            className="toolbar-icon-button"
            style={{ position: "relative" }}>
            <View className="icon-bell" />
            {unreadCount > 0 ? (
              <View className="dashboard-badge">
                {unreadCount > 99 ? "99+" : unreadCount}
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>

      <View className="dashboard-masthead dashboard-masthead--compact">
        <Text className="dashboard-masthead__copy">
          {currentWorkspace
            ? `${currentWorkspace.name} · ${
                pendingTotal > 0
                  ? `${pendingTotal} 件事正在厨房里发生`
                  : "厨房清闲，适合点一道喜欢的菜"
              }`
            : "创建一个共同厨房，把想吃的认真交给重要的人。"}
        </Text>
      </View>

      <View className="dashboard-stat-strip">
        {STATUS_BADGES.map((badge) => (
          <Pressable
            key={badge.key}
            onClick={() => handleStatusFilter(badge.key)}>
            <View
              className={`dashboard-stat-chip dashboard-stat-chip--${badge.key}`}>
              <Text className="dashboard-stat-chip__count">
                {statusCounts[badge.key] || 0}
              </Text>
              <Text className="dashboard-stat-chip__label">
                {badge.label}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <SectionCard
        title={
          recentTasks.length > 0
            ? `最近 ${recentTasks.length} 条任务`
            : "还没有任务"
        }
        actions={
          recentTasks.length > 0 ? (
            <Button
              className="app-button app-button--ghost app-button--mini"
              onClick={handleViewAllTasks}>
              查看全部
            </Button>
          ) : undefined
        }
        variant="soft">
        {isLoading ? (
          <View>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : recentTasks.length === 0 ? (
          <EmptyState
            tone="gray"
            title="还没有任务"
            description="点击底部点单按钮，选一道菜和执行人，发起第一个任务。"
          />
        ) : (
          <View>
            {recentTasks.map((task) => {
              const statusMeta =
                orderStatusMetaMap[task.status as TaskStatus];
              const wsName =
                (task as { workspace?: { name?: string } }).workspace
                  ?.name || "";
              return (
                <Pressable
                  key={task.id}
                  onClick={() => handleTaskClick(task)}>
                  <View
                    className={`task-card task-card--${statusMeta.tone}`}>
                    <View className="task-card__bar" />
                    <View className="task-card__body">
                      <View className="task-card__header">
                        <Text className="task-card__title">
                          {task.recipe?.name || `任务 #${task.id}`}
                        </Text>
                        <StatusChip
                          label={statusMeta.label}
                          tone={statusMeta.tone}
                        />
                      </View>
                      <Text className="task-card__meta">
                        {task.creator?.nickname || "未知"} →{" "}
                        {task.assignee?.nickname || "待指派"}
                        {wsName ? ` · ${wsName}` : ""}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </SectionCard>

      {/* 弹窗 */}
      <InputDialog
        visible={dialogMode === "create"}
        title="新建空间"
        value={dialogValue}
        placeholder="例如：我们家厨房"
        confirmText="创建"
        loading={submitting}
        onChange={setDialogValue}
        onCancel={() => {
          setDialogMode(null);
          setDialogValue("");
        }}
        onConfirm={handleCreateWorkspace}
      />
      <InputDialog
        visible={dialogMode === "join"}
        title="输入邀请码"
        value={dialogValue}
        placeholder="例如：GRBQ7X"
        confirmText="加入"
        loading={submitting}
        onChange={(v: string) => setDialogValue(v.toUpperCase())}
        onCancel={() => {
          setDialogMode(null);
          setDialogValue("");
        }}
        onConfirm={handleJoinWorkspace}
      />
      {isH5 ? <TabBarPlus activeKey="index" /> : null}
    </View>
  );
}
