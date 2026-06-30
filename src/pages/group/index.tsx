import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input, Text, View } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";
import AsyncContainer from "@/components/async-container";
import CompactHeader from "@/components/compact-header";
import EmptyState from "@/components/empty-state";
import InputDialog from "@/components/input-dialog";
import MemberAvatar from "@/components/member-avatar";
import Page from "@/components/page";
import Pressable from "@/components/pressable";
import SectionCard from "@/components/section-card";
import { SkeletonCard } from "@/components/skeleton";
import { userApi, workspaceApi } from "@/services/api";
import type { WorkspaceMemberView } from "@/services/workspace.api";
import type { Workspace } from "@shared/types";
import { showErrorToast } from "@/utils/error";
import { getMemberDisplayName } from "@/utils/member";
import {
  getRouteNumberParam,
  reLaunchToWorkspaceEntry,
} from "@/utils/router";
import { setPreferredWorkspaceId } from "@/utils/workspace";

const roleLabelMap: Record<string, string> = {
  requester: "点餐人",
  cook: "制作者",
  both: "双角色",
};

type WorkspaceRoleTemplate = {
  id: number;
  name: string;
  description?: string | null;
};

const formatInviteExpiry = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getWorkspaceMemberSubtitle = (member: WorkspaceMemberView) => {
  const nickname = member.user?.nickname?.trim();
  const remark = member.remark?.trim();
  const tagName = member.tag?.name?.trim();
  if (remark && nickname && remark !== nickname) return `昵称：${nickname}`;
  if (tagName && tagName !== remark && tagName !== nickname) {
    return `称谓模板：${tagName}`;
  }
  return "";
};

const getMemberPermissionSummary = (member: WorkspaceMemberView) => {
  const items: string[] = [];
  if (member.canManageWorkspace) items.push("管空间");
  if (member.canManageMembers) items.push("管成员");
  if (member.canManageRecipes) items.push("管菜谱");
  if (member.canCreateTask) items.push("可发起");
  if (member.canAcceptTask) items.push("可制作");
  return items.join(" · ") || "普通成员";
};

export default function Group() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(0);
  const [myRemarkDraft, setMyRemarkDraft] = useState("");
  const [savingMyRemark, setSavingMyRemark] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [savingWorkspaceName, setSavingWorkspaceName] = useState(false);

  const router = useRouter();
  const workspaceId = getRouteNumberParam(
    router.params,
    "workspaceId",
    "id"
  );

  const loadWorkspace = useCallback(async () => {
    if (!workspaceId) {
      reLaunchToWorkspaceEntry();
      return;
    }
    setLoading(true);
    try {
      const data = await workspaceApi.getDetail(workspaceId);
      const profile = await userApi.getProfile();
      setPreferredWorkspaceId(data?.id || workspaceId);
      setWorkspace(data);
      setCurrentUserId(profile?.id || 0);
      setRenameDraft(data?.name || "");
      const myMember = ((data?.members || []) as WorkspaceMemberView[]).find(
        (m) => m.userId === profile?.id
      );
      setMyRemarkDraft(myMember?.remark || "");
    } catch (error) {
      showErrorToast(error, "加载失败");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const allMembers = (workspace?.members || []) as WorkspaceMemberView[];
  const members = useMemo(
    () => allMembers.filter((member) => member.status === "active"),
    [allMembers]
  );
  const recipes = (workspace?.recipes || []) as Array<{
    id: number;
    name: string;
    status?: string;
  }>;
  const activeRecipes = useMemo(
    () => recipes.filter((r) => r.status !== "archived"),
    [recipes]
  );
  const roleTemplates = ((workspace as Workspace & {
    roleTemplates?: WorkspaceRoleTemplate[];
  } | null)?.roleTemplates || []) as WorkspaceRoleTemplate[];
  const currentMember = useMemo(
    () => members.find((m) => m.userId === currentUserId),
    [currentUserId, members]
  );
  const isWorkspaceOwner = workspace?.ownerUserId === currentUserId;
  const canCurrentManageWorkspace = Boolean(
    currentMember?.canManageWorkspace || isWorkspaceOwner
  );
  const canCurrentManageMembers = Boolean(
    currentMember?.canManageMembers || canCurrentManageWorkspace
  );
  const managers = useMemo(
    () =>
      members.filter(
        (m) =>
          m.canManageWorkspace ||
          m.canManageMembers ||
          m.userId === workspace?.ownerUserId
      ),
    [members, workspace?.ownerUserId]
  );
  const permissionStats = useMemo(
    () => [
      {
        label: "管空间",
        value: members.filter((m) => m.canManageWorkspace).length,
      },
      {
        label: "管成员",
        value: members.filter((m) => m.canManageMembers).length,
      },
      {
        label: "管菜谱",
        value: members.filter((m) => m.canManageRecipes).length,
      },
      {
        label: "可发起",
        value: members.filter((m) => m.canCreateTask).length,
      },
      {
        label: "可制作",
        value: members.filter((m) => m.canAcceptTask).length,
      },
    ],
    [members]
  );

  const identityLabel = isWorkspaceOwner
    ? "空间主"
    : canCurrentManageWorkspace || canCurrentManageMembers
      ? "管理员"
      : "成员";

  const requireManageWorkspace = () => {
    if (canCurrentManageWorkspace) return true;
    showErrorToast(new Error("你没有管理空间的权限"));
    return false;
  };

  const requireManageMembers = () => {
    if (canCurrentManageMembers) return true;
    showErrorToast(new Error("你没有管理成员的权限"));
    return false;
  };

  const handleMemberClick = (memberId: number) => {
    if (!requireManageMembers()) return;
    Taro.navigateTo({
      url: `/pages/member-form/index?workspaceId=${workspaceId}&memberId=${memberId}`,
    });
  };

  const handleOpenRoleTemplates = () => {
    if (!requireManageMembers()) return;
    Taro.navigateTo({
      url: `/pages/tag/index?workspaceId=${workspaceId}`,
    });
  };

  const handleRenameWorkspace = () => {
    if (!requireManageWorkspace()) return;
    setRenameDraft(workspace?.name || "");
    setRenameVisible(true);
  };

  const handleSaveWorkspaceName = async () => {
    const nextName = renameDraft.trim();
    if (!workspaceId || savingWorkspaceName) return;
    if (!nextName) {
      showErrorToast(new Error("空间名称不能为空"));
      return;
    }
    setSavingWorkspaceName(true);
    try {
      await workspaceApi.update(workspaceId, { name: nextName });
      Taro.showToast({ title: "已保存", icon: "success" });
      setRenameVisible(false);
      await loadWorkspace();
    } catch (error) {
      showErrorToast(error, "保存失败");
    } finally {
      setSavingWorkspaceName(false);
    }
  };

  const handleSaveMyRemark = async () => {
    if (savingMyRemark) return;
    setSavingMyRemark(true);
    try {
      Taro.showLoading({ title: "保存中..." });
      await workspaceApi.updateMyRemark(
        workspaceId,
        myRemarkDraft.trim() || null
      );
      Taro.hideLoading();
      Taro.showToast({ title: "备注已保存", icon: "success" });
      await loadWorkspace();
    } catch (error) {
      Taro.hideLoading();
      showErrorToast(error, "保存失败");
    } finally {
      setSavingMyRemark(false);
    }
  };

  const handleRefreshInviteCode = async () => {
    if (!isWorkspaceOwner) {
      showErrorToast(new Error("只有空间拥有者可刷新邀请码"));
      return;
    }
    try {
      Taro.showLoading({ title: "生成中..." });
      const invite = await workspaceApi.createInvite(workspaceId);
      Taro.hideLoading();
      setWorkspace((cur) =>
        cur
          ? ({
              ...cur,
              inviteCode: invite?.inviteCode || cur.inviteCode,
              inviteExpiredAt: invite?.expiredAt || cur.inviteExpiredAt,
            } as Workspace)
          : cur
      );
      Taro.showToast({ title: "邀请码已更新", icon: "success" });
    } catch (error) {
      Taro.hideLoading();
      showErrorToast(error, "生成失败");
    }
  };

  const handleCopyInviteCode = async () => {
    if (!workspace?.inviteCode) {
      Taro.showToast({
        title: "暂无邀请码",
        icon: "none",
      });
      return;
    }
    try {
      await Taro.setClipboardData({
        data: workspace.inviteCode,
      });
      Taro.showToast({
        title: "已复制",
        icon: "success",
      });
    } catch (error) {
      showErrorToast(error, "复制失败");
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!isWorkspaceOwner) {
      showErrorToast(new Error("只有空间拥有者可删除空间"));
      return;
    }

    const result = await Taro.showModal({
      title: "删除空间",
      content: "删除后该空间会从成员列表中移除，邀请码也会失效。确认删除吗？",
      confirmText: "删除",
      confirmColor: "#c2415d",
    });
    if (!result.confirm) return;

    try {
      Taro.showLoading({ title: "删除中..." });
      await workspaceApi.delete(workspaceId);
      Taro.hideLoading();
      setPreferredWorkspaceId(0);
      Taro.showToast({ title: "已删除", icon: "success" });
      setTimeout(() => {
        Taro.reLaunch({ url: "/pages/workspace-entry/index" });
      }, 400);
    } catch (error) {
      Taro.hideLoading();
      showErrorToast(error, "删除失败");
    }
  };

  return (
    <Page title={workspace?.name || "空间管理"} tone="sunset" topSpacerMode="header">
      <AsyncContainer
        loading={loading}
        data={workspace}
        skeleton={
          <View>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        }
        empty={
          <EmptyState
            tone="gray"
            title="空间不存在"
            description="该空间可能已被删除。"
          />
        }>
        {(ws) => (
          <View className="workspace-management">
            <CompactHeader
              tone="sunset"
              title={ws.name}
              meta={
                <>
                  <Text className="compact-header__meta-item">
                    {identityLabel}
                  </Text>
                  <Text className="compact-header__meta-item">
                    {members.length} 成员
                  </Text>
                  <Text className="compact-header__meta-item">
                    {roleTemplates.length} 头衔
                  </Text>
                </>
              }
            />

            <View className="workspace-overview-card">
              <View className="workspace-overview-card__header">
                <View>
                  <Text className="workspace-overview-card__eyebrow">
                    空间概览
                  </Text>
                  <Text className="workspace-overview-card__title">
                    {ws.name}
                  </Text>
                </View>
                <Text className="tool-pill tool-pill--strong">
                  {identityLabel}
                </Text>
              </View>
              <View className="workspace-stat-grid">
                <View className="workspace-stat">
                  <Text className="workspace-stat__value">{members.length}</Text>
                  <Text className="workspace-stat__label">成员</Text>
                </View>
                <View className="workspace-stat">
                  <Text className="workspace-stat__value">{managers.length}</Text>
                  <Text className="workspace-stat__label">管理者</Text>
                </View>
                <View className="workspace-stat">
                  <Text className="workspace-stat__value">
                    {roleTemplates.length}
                  </Text>
                  <Text className="workspace-stat__label">头衔</Text>
                </View>
                <View className="workspace-stat">
                  <Text className="workspace-stat__value">
                    {activeRecipes.length}
                  </Text>
                  <Text className="workspace-stat__label">菜谱资产</Text>
                </View>
              </View>
            </View>

            <SectionCard
              title="空间资料"
              description="维护空间本身的信息。">
              <View className="workspace-setting-list">
                <View className="workspace-setting-row">
                  <View className="workspace-setting-row__main">
                    <Text className="workspace-setting-row__label">空间名称</Text>
                    <Text className="workspace-setting-row__value">
                      {ws.name}
                    </Text>
                  </View>
                  <Button
                    className="workspace-setting-row__action"
                    onClick={handleRenameWorkspace}>
                    {canCurrentManageWorkspace ? "修改" : "无权限"}
                  </Button>
                </View>
                <View className="workspace-setting-row workspace-setting-row--editable">
                  <View className="workspace-setting-row__main">
                    <Text className="workspace-setting-row__label">
                      我的空间称呼
                    </Text>
                    <Input
                      className="workspace-setting-row__input"
                      maxlength={50}
                      confirmType="done"
                      placeholder="未设置"
                      value={myRemarkDraft}
                      onConfirm={handleSaveMyRemark}
                      onInput={(e) => setMyRemarkDraft(e.detail.value)}
                    />
                  </View>
                  <Button
                    className="workspace-setting-row__action workspace-setting-row__action--primary"
                    loading={savingMyRemark}
                    disabled={savingMyRemark}
                    onClick={handleSaveMyRemark}>
                    保存
                  </Button>
                </View>
              </View>
            </SectionCard>

            <SectionCard
              title="成员管理"
              description="查看成员身份，进入后可调整角色、权限或移除成员。"
              actions={
                <Button
                  className="app-button app-button--ghost app-button--mini"
                  onClick={handleOpenRoleTemplates}>
                  管理头衔
                </Button>
              }
              meta={`${members.length} 人`}>
              <View className="workspace-list">
                {members.map((member) => {
                  const subtitle = getWorkspaceMemberSubtitle(member);
                  const isCurrentUser = member.userId === currentUserId;
                  const isOwner = member.userId === ws.ownerUserId;
                  return (
                    <Pressable
                      key={member.id}
                      onClick={() => handleMemberClick(member.id)}>
                      <View
                        className={`workspace-member-card ${
                          isCurrentUser ? "workspace-member-card--me" : ""
                        }`}>
                        <MemberAvatar
                          className="workspace-member-card__avatar"
                          member={member}
                          size="md"
                        />
                        <View className="workspace-member-card__body">
                          <View className="workspace-member-card__top">
                            <Text className="workspace-member-card__name">
                              {getMemberDisplayName(member)}
                            </Text>
                            <Text className="tool-pill">
                              {isOwner
                                ? "空间主"
                                : member.displayRole
                                  ? roleLabelMap[member.displayRole]
                                  : "未定义"}
                            </Text>
                          </View>
                          <Text className="workspace-member-card__meta">
                            {subtitle || getMemberPermissionSummary(member)}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </SectionCard>

            <SectionCard
              title="权限分布"
              description="快速检查空间里关键能力分别给了多少人。"
              variant="soft">
              <View className="workspace-permission-grid">
                {permissionStats.map((item) => (
                  <View key={item.label} className="workspace-permission-stat">
                    <Text className="workspace-permission-stat__value">
                      {item.value}
                    </Text>
                    <Text className="workspace-permission-stat__label">
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            </SectionCard>

            <SectionCard
              title="空间头衔"
              description="头衔用于统一成员在空间里的称呼模板。"
              actions={
                <Button
                  className="app-button app-button--secondary app-button--mini"
                  onClick={handleOpenRoleTemplates}>
                  设置
                </Button>
              }
              meta={`${roleTemplates.length} 个`}>
              {roleTemplates.length > 0 ? (
                <View className="workspace-list">
                  {roleTemplates.map((template) => {
                    const useCount = members.filter(
                      (member) => member.tag?.id === template.id
                    ).length;
                    return (
                      <View
                        key={template.id}
                        className="workspace-list-card workspace-list-card--title">
                        <View className="workspace-list-card__main">
                          <Text className="workspace-list-card__title">
                            {template.name}
                          </Text>
                          <Text className="workspace-list-card__desc">
                            {template.description || "暂无说明"}
                          </Text>
                        </View>
                        <Text className="tool-pill">{useCount} 人</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <EmptyState
                  tone="amber"
                  title="暂无头衔"
                  description="可以先建立常用称呼模板，再分配给成员。"
                />
              )}
            </SectionCard>

            <SectionCard
              title="邀请成员"
              description="复制邀请码给新成员加入空间。"
              actions={
                <Button
                  className="app-button app-button--ghost app-button--mini"
                  onClick={handleRefreshInviteCode}>
                  刷新
                </Button>
              }
              variant="accent">
              <View className="workspace-invite-card">
                <View>
                  <Text className="workspace-invite-card__label">
                    Invite Code
                  </Text>
                  <Text className="workspace-invite-card__code">
                    {ws.inviteCode || "暂未生成"}
                  </Text>
                  <Text className="workspace-invite-card__desc">
                    {ws.inviteExpiredAt
                      ? `有效期至 ${formatInviteExpiry(ws.inviteExpiredAt)}`
                      : "刷新一次就会生成新的邀请码"}
                  </Text>
                </View>
                <Button
                  className="app-button app-button--primary app-button--mini"
                  onClick={handleCopyInviteCode}>
                  复制
                </Button>
              </View>
            </SectionCard>

            <SectionCard
              title="危险操作"
              description="删除空间后，成员将无法再进入该空间。"
              variant="warning">
              <View className="workspace-danger-card">
                <View>
                  <Text className="workspace-danger-card__title">删除空间</Text>
                  <Text className="workspace-danger-card__desc">
                    仅空间拥有者可删除。空间会从列表移除，邀请码同步失效。
                  </Text>
                </View>
                <Button
                  className="app-button app-button--warn app-button--mini workspace-danger-card__action"
                  onClick={handleDeleteWorkspace}>
                  删除
                </Button>
              </View>
            </SectionCard>

            <InputDialog
              visible={renameVisible}
              title="修改空间名称"
              value={renameDraft}
              placeholder="请输入空间名称"
              confirmText="保存"
              loading={savingWorkspaceName}
              maxLength={30}
              onChange={setRenameDraft}
              onCancel={() => setRenameVisible(false)}
              onConfirm={handleSaveWorkspaceName}
            />
          </View>
        )}
      </AsyncContainer>
    </Page>
  );
}
