package ai.gameforge.runtime.client;

import ai.gameforge.runtime.GameForgeRuntime;
import ai.gameforge.runtime.GameForgeRuntime.GameForgeProject;
import ai.gameforge.runtime.GameForgeRuntime.ProjectAction;
import com.mojang.blaze3d.platform.InputConstants;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import net.minecraft.util.FormattedCharSequence;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.RegisterKeyMappingsEvent;
import net.minecraftforge.client.settings.KeyConflictContext;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import org.lwjgl.glfw.GLFW;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class ClientRuntime {
    private static final KeyMapping OPEN_DASHBOARD = new KeyMapping(
        "key.gameforge_runtime.open",
        KeyConflictContext.IN_GAME,
        InputConstants.Type.KEYSYM,
        GLFW.GLFW_KEY_G,
        "key.categories.gameforge_runtime"
    );

    private ClientRuntime() {
    }

    @Mod.EventBusSubscriber(modid = GameForgeRuntime.MOD_ID, value = Dist.CLIENT, bus = Mod.EventBusSubscriber.Bus.MOD)
    public static final class ModEvents {
        private ModEvents() {
        }

        @SubscribeEvent
        public static void registerKeys(RegisterKeyMappingsEvent event) {
            event.register(OPEN_DASHBOARD);
        }
    }

    @Mod.EventBusSubscriber(modid = GameForgeRuntime.MOD_ID, value = Dist.CLIENT, bus = Mod.EventBusSubscriber.Bus.FORGE)
    public static final class ForgeEvents {
        private ForgeEvents() {
        }

        @SubscribeEvent
        public static void clientTick(TickEvent.ClientTickEvent event) {
            if (event.phase != TickEvent.Phase.END) {
                return;
            }
            while (OPEN_DASHBOARD.consumeClick()) {
                Minecraft.getInstance().setScreen(new RuntimeScreen());
            }
        }
    }

    private enum Tab {
        PROJECTS("screen.gameforge_runtime.projects", "▦"),
        DIAGNOSTICS("screen.gameforge_runtime.diagnostics", "✓"),
        HELP("screen.gameforge_runtime.help", "?");

        private final String translationKey;
        private final String icon;

        Tab(String translationKey, String icon) {
            this.translationKey = translationKey;
            this.icon = icon;
        }
    }

    public static final class RuntimeScreen extends Screen {
        private static final int BACKGROUND = 0xF2080C17;
        private static final int PANEL = 0xF5111829;
        private static final int PANEL_ALT = 0xF51A2439;
        private static final int CARD = 0xF51D2942;
        private static final int CARD_HOVER = 0xF5263657;
        private static final int BORDER = 0xFF334362;
        private static final int ACCENT = 0xFF80A9FF;
        private static final int ACCENT_PURPLE = 0xFF8C7DFF;
        private static final int TEXT = 0xFFEEF4FF;
        private static final int MUTED = 0xFF9FACBF;
        private static final int SUCCESS = 0xFF77E2AC;
        private static final int WARNING = 0xFFFFD28D;
        private static final int DANGER = 0xFFFF8D9A;

        private final List<HitBox> hitBoxes = new ArrayList<>();
        private List<GameForgeProject> projects = List.of();
        private List<GameForgeProject> filteredProjects = List.of();
        private GameForgeProject selected;
        private EditBox searchBox;
        private Tab tab = Tab.PROJECTS;
        private int listScroll;
        private String status = "按 G 可随时重新打开";
        private int statusColor = MUTED;

        public RuntimeScreen() {
            super(Component.translatable("screen.gameforge_runtime.title"));
            refreshProjects();
        }

        @Override
        protected void init() {
            int[] layout = layout();
            int panelX = layout[0];
            int panelY = layout[1];
            int panelW = layout[2];
            int sidebarW = layout[4];

            searchBox = new EditBox(
                this.font,
                panelX + sidebarW + 22,
                panelY + 54,
                Math.max(140, panelW - sidebarW - 44),
                22,
                Component.translatable("screen.gameforge_runtime.search")
            );
            searchBox.setHint(Component.translatable("screen.gameforge_runtime.search"));
            searchBox.setResponder(this::filterProjects);
            searchBox.setVisible(tab == Tab.PROJECTS);
            searchBox.setBordered(true);
            this.addRenderableWidget(searchBox);
        }

        private void refreshProjects() {
            projects = GameForgeRuntime.ProjectCatalog.scan();
            filteredProjects = projects;
            selected = projects.isEmpty() ? null : projects.get(0);
            listScroll = 0;
            status = projects.isEmpty()
                ? "未检测到作品；请把 GameForge 作品 JAR 放进 mods"
                : "已检测到 " + projects.size() + " 个 GameForge 作品";
            statusColor = projects.isEmpty() ? WARNING : SUCCESS;
            if (searchBox != null) {
                searchBox.setValue("");
            }
        }

        private void filterProjects(String query) {
            String normalized = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
            filteredProjects = normalized.isEmpty()
                ? projects
                : projects.stream()
                    .filter(project -> project.name().toLowerCase(Locale.ROOT).contains(normalized)
                        || project.namespace().toLowerCase(Locale.ROOT).contains(normalized)
                        || project.description().toLowerCase(Locale.ROOT).contains(normalized))
                    .toList();
            if (selected == null || !filteredProjects.contains(selected)) {
                selected = filteredProjects.isEmpty() ? null : filteredProjects.get(0);
            }
            listScroll = 0;
        }

        @Override
        public void render(GuiGraphics graphics, int mouseX, int mouseY, float partialTick) {
            hitBoxes.clear();
            graphics.fill(0, 0, this.width, this.height, BACKGROUND);
            graphics.fillGradient(0, 0, this.width, Math.max(70, this.height / 3), 0, 0x553E5FCB, 0x00080C17);

            int[] layout = layout();
            int panelX = layout[0];
            int panelY = layout[1];
            int panelW = layout[2];
            int panelH = layout[3];
            int sidebarW = layout[4];

            graphics.fill(panelX - 4, panelY + 4, panelX + panelW + 4, panelY + panelH + 8, 0x66000000);
            graphics.fill(panelX - 1, panelY - 1, panelX + panelW + 1, panelY + panelH + 1, BORDER);
            graphics.fill(panelX, panelY, panelX + panelW, panelY + panelH, PANEL);
            graphics.fill(panelX, panelY, panelX + sidebarW, panelY + panelH, PANEL_ALT);
            graphics.fill(panelX + sidebarW - 1, panelY, panelX + sidebarW, panelY + panelH, BORDER);

            renderBrand(graphics, panelX, panelY, sidebarW);
            renderNavigation(graphics, mouseX, mouseY, panelX, panelY, sidebarW);
            renderHeader(graphics, panelX + sidebarW, panelY, panelW - sidebarW);

            if (tab == Tab.PROJECTS) {
                renderProjects(graphics, mouseX, mouseY, panelX + sidebarW, panelY, panelW - sidebarW, panelH);
            } else if (tab == Tab.DIAGNOSTICS) {
                renderDiagnostics(graphics, panelX + sidebarW, panelY, panelW - sidebarW, panelH, mouseX, mouseY);
            } else {
                renderHelp(graphics, panelX + sidebarW, panelY, panelW - sidebarW, panelH, mouseX, mouseY);
            }

            graphics.fill(panelX + sidebarW, panelY + panelH - 28, panelX + panelW, panelY + panelH, 0xCC0D1423);
            graphics.drawString(this.font, status, panelX + sidebarW + 14, panelY + panelH - 19, statusColor, false);
            graphics.drawString(
                this.font,
                "Minecraft 1.20.1 · Forge 47.x · Runtime " + GameForgeRuntime.VERSION,
                panelX + panelW - this.font.width("Minecraft 1.20.1 · Forge 47.x · Runtime " + GameForgeRuntime.VERSION) - 12,
                panelY + panelH - 19,
                MUTED,
                false
            );

            super.render(graphics, mouseX, mouseY, partialTick);
        }

        private void renderBrand(GuiGraphics graphics, int panelX, int panelY, int sidebarW) {
            int logoX = panelX + 18;
            int logoY = panelY + 18;
            graphics.fill(logoX, logoY, logoX + 30, logoY + 30, ACCENT_PURPLE);
            graphics.fill(logoX + 2, logoY + 2, logoX + 28, logoY + 28, 0xFF111829);
            graphics.drawCenteredString(this.font, "GF", logoX + 15, logoY + 11, ACCENT);
            graphics.drawString(this.font, "GAMEFORGE", logoX + 38, logoY + 4, TEXT, false);
            graphics.drawString(this.font, "RUNTIME", logoX + 38, logoY + 17, ACCENT, false);
            graphics.fill(panelX + 16, panelY + 58, panelX + sidebarW - 16, panelY + 59, BORDER);
        }

        private void renderNavigation(GuiGraphics graphics, int mouseX, int mouseY, int panelX, int panelY, int sidebarW) {
            int y = panelY + 76;
            for (Tab candidate : Tab.values()) {
                int x = panelX + 12;
                int width = sidebarW - 24;
                boolean active = tab == candidate;
                boolean hovered = inside(mouseX, mouseY, x, y, width, 28);
                int background = active ? 0xFF263A62 : hovered ? 0xFF202F4D : 0x00111829;
                graphics.fill(x, y, x + width, y + 28, background);
                if (active) {
                    graphics.fill(x, y, x + 3, y + 28, ACCENT);
                }
                graphics.drawCenteredString(this.font, candidate.icon, x + 14, y + 10, active ? ACCENT : MUTED);
                graphics.drawString(
                    this.font,
                    Component.translatable(candidate.translationKey),
                    x + 28,
                    y + 10,
                    active ? TEXT : MUTED,
                    false
                );
                hitBoxes.add(new HitBox(x, y, width, 28, () -> switchTab(candidate)));
                y += 34;
            }

            int closeY = panelY + layout()[3] - 64;
            drawManualButton(
                graphics,
                mouseX,
                mouseY,
                panelX + 14,
                closeY,
                sidebarW - 28,
                26,
                Component.translatable("screen.gameforge_runtime.close").getString(),
                ButtonKind.SECONDARY,
                this::onClose
            );
        }

        private void switchTab(Tab newTab) {
            tab = newTab;
            if (searchBox != null) {
                searchBox.setVisible(tab == Tab.PROJECTS);
                searchBox.setFocused(false);
            }
            status = switch (newTab) {
                case PROJECTS -> projects.isEmpty() ? "没有检测到作品" : "选择作品后可直接运行核心操作";
                case DIAGNOSTICS -> "兼容目标：Minecraft Java 1.20.1 + Forge 47.x";
                case HELP -> "GameForge Runtime 需要客户端与服务端同时安装";
            };
            statusColor = newTab == Tab.DIAGNOSTICS ? SUCCESS : MUTED;
        }

        private void renderHeader(GuiGraphics graphics, int contentX, int panelY, int contentW) {
            graphics.drawString(this.font, Component.translatable(tab.translationKey), contentX + 22, panelY + 20, TEXT, false);
            graphics.drawString(this.font, "低代码作品统一管理控制台", contentX + 22, panelY + 34, MUTED, false);
            graphics.fill(contentX + 20, panelY + 46, contentX + contentW - 20, panelY + 47, BORDER);
        }

        private void renderProjects(
            GuiGraphics graphics,
            int mouseX,
            int mouseY,
            int contentX,
            int panelY,
            int contentW,
            int panelH
        ) {
            int bodyTop = panelY + 86;
            int bodyBottom = panelY + panelH - 34;
            int listWidth = Math.max(190, Math.min(290, contentW * 40 / 100));
            int listX = contentX + 20;
            int detailX = listX + listWidth + 14;
            int detailWidth = contentX + contentW - 20 - detailX;

            if (projects.isEmpty()) {
                graphics.fill(contentX + 20, bodyTop, contentX + contentW - 20, bodyBottom, 0x88141D30);
                graphics.drawCenteredString(
                    this.font,
                    Component.translatable("screen.gameforge_runtime.empty"),
                    contentX + contentW / 2,
                    bodyTop + 58,
                    TEXT
                );
                graphics.drawCenteredString(
                    this.font,
                    Component.translatable("screen.gameforge_runtime.empty_hint"),
                    contentX + contentW / 2,
                    bodyTop + 78,
                    MUTED
                );
                drawManualButton(
                    graphics,
                    mouseX,
                    mouseY,
                    contentX + contentW / 2 - 70,
                    bodyTop + 108,
                    140,
                    28,
                    Component.translatable("screen.gameforge_runtime.refresh").getString(),
                    ButtonKind.PRIMARY,
                    this::refreshProjects
                );
                return;
            }

            graphics.fill(listX, bodyTop, listX + listWidth, bodyBottom, 0x99101829);
            graphics.fill(listX + listWidth + 6, bodyTop, listX + listWidth + 7, bodyBottom, BORDER);
            int viewportHeight = bodyBottom - bodyTop;
            int contentHeight = filteredProjects.size() * 68;
            int maxScroll = Math.max(0, contentHeight - viewportHeight);
            listScroll = Math.max(0, Math.min(listScroll, maxScroll));

            graphics.enableScissor(listX, bodyTop, listX + listWidth, bodyBottom);
            int cardY = bodyTop - listScroll;
            for (GameForgeProject project : filteredProjects) {
                boolean selectedCard = project.equals(selected);
                boolean hovered = inside(mouseX, mouseY, listX + 6, cardY + 4, listWidth - 12, 60);
                int color = selectedCard ? 0xFF263A62 : hovered ? CARD_HOVER : CARD;
                graphics.fill(listX + 6, cardY + 4, listX + listWidth - 6, cardY + 64, color);
                if (selectedCard) {
                    graphics.fill(listX + 6, cardY + 4, listX + 9, cardY + 64, ACCENT);
                }
                graphics.drawString(this.font, project.name(), listX + 16, cardY + 13, TEXT, false);
                graphics.drawString(this.font, project.namespace(), listX + 16, cardY + 27, ACCENT, false);
                graphics.drawString(this.font, project.compactSummary(), listX + 16, cardY + 44, MUTED, false);
                int capturedY = cardY;
                hitBoxes.add(new HitBox(listX + 6, capturedY + 4, listWidth - 12, 60, () -> selected = project));
                cardY += 68;
            }
            graphics.disableScissor();

            if (filteredProjects.isEmpty()) {
                graphics.drawCenteredString(this.font, "没有匹配的作品", listX + listWidth / 2, bodyTop + 30, MUTED);
            }

            renderProjectDetails(graphics, mouseX, mouseY, detailX, bodyTop, detailWidth, bodyBottom - bodyTop);
        }

        private void renderProjectDetails(
            GuiGraphics graphics,
            int mouseX,
            int mouseY,
            int x,
            int y,
            int width,
            int height
        ) {
            graphics.fill(x, y, x + width, y + height, 0x99141D30);
            if (selected == null) {
                graphics.drawCenteredString(this.font, "请选择一个作品", x + width / 2, y + 36, MUTED);
                return;
            }

            graphics.fill(x, y, x + width, y + 3, ACCENT_PURPLE);
            graphics.drawString(this.font, selected.name(), x + 18, y + 18, TEXT, false);
            graphics.drawString(this.font, "命名空间  " + selected.namespace(), x + 18, y + 34, ACCENT, false);
            graphics.drawString(this.font, selected.compactSummary(), x + 18, y + 50, MUTED, false);

            int textY = y + 72;
            for (FormattedCharSequence line : this.font.split(Component.literal(selected.description()), Math.max(100, width - 36))) {
                graphics.drawString(this.font, line, x + 18, textY, MUTED);
                textY += 11;
                if (textY > y + 116) {
                    break;
                }
            }

            int buttonY = Math.max(y + 126, textY + 12);
            int gap = 8;
            int twoColumnWidth = Math.max(76, (width - 36 - gap) / 2);
            drawManualButton(
                graphics, mouseX, mouseY, x + 18, buttonY, twoColumnWidth, 28,
                Component.translatable("screen.gameforge_runtime.menu").getString(),
                ButtonKind.PRIMARY,
                () -> runAction(ProjectAction.MENU)
            );
            drawManualButton(
                graphics, mouseX, mouseY, x + 18 + twoColumnWidth + gap, buttonY, twoColumnWidth, 28,
                Component.translatable("screen.gameforge_runtime.get_all").getString(),
                ButtonKind.PRIMARY,
                () -> runAction(ProjectAction.GET_ALL)
            );
            buttonY += 36;
            drawManualButton(
                graphics, mouseX, mouseY, x + 18, buttonY, twoColumnWidth, 28,
                Component.translatable("screen.gameforge_runtime.spawn_all").getString(),
                ButtonKind.SECONDARY,
                () -> runAction(ProjectAction.SPAWN_ALL)
            );
            drawManualButton(
                graphics, mouseX, mouseY, x + 18 + twoColumnWidth + gap, buttonY, twoColumnWidth, 28,
                Component.translatable("screen.gameforge_runtime.doctor").getString(),
                ButtonKind.SUCCESS,
                () -> runAction(ProjectAction.DOCTOR)
            );
            buttonY += 36;
            drawManualButton(
                graphics, mouseX, mouseY, x + 18, buttonY, width - 36, 28,
                Component.translatable("screen.gameforge_runtime.cleanup").getString(),
                ButtonKind.DANGER,
                () -> runAction(ProjectAction.CLEANUP)
            );

            int infoY = y + height - 54;
            graphics.fill(x + 18, infoY, x + width - 18, infoY + 1, BORDER);
            graphics.drawString(this.font, "来源 Mod：" + selected.sourceModId(), x + 18, infoY + 10, MUTED, false);
            graphics.drawString(this.font, "组件总数：" + selected.componentCount(), x + 18, infoY + 24, MUTED, false);
        }

        private void runAction(ProjectAction action) {
            if (selected == null) {
                return;
            }
            GameForgeRuntime.sendAction(selected.namespace(), action);
            status = Component.translatable("message.gameforge_runtime.sent", action.displayName()).getString();
            statusColor = ACCENT;
        }

        private void renderDiagnostics(
            GuiGraphics graphics,
            int contentX,
            int panelY,
            int contentW,
            int panelH,
            int mouseX,
            int mouseY
        ) {
            int x = contentX + 22;
            int y = panelY + 66;
            int usableW = contentW - 44;
            int cardW = (usableW - 12) / 2;

            diagnosticCard(graphics, x, y, cardW, 72, "Minecraft", "1.20.1", SUCCESS);
            diagnosticCard(graphics, x + cardW + 12, y, cardW, 72, "Forge", "47.x", SUCCESS);
            y += 84;
            diagnosticCard(graphics, x, y, cardW, 72, "Runtime", GameForgeRuntime.VERSION, SUCCESS);
            diagnosticCard(
                graphics,
                x + cardW + 12,
                y,
                cardW,
                72,
                "检测到的作品",
                Integer.toString(projects.size()),
                projects.isEmpty() ? WARNING : SUCCESS
            );
            y += 96;

            graphics.drawString(this.font, "兼容状态", x, y, TEXT, false);
            y += 18;
            drawCheckLine(graphics, x, y, "客户端 Runtime 已加载", true);
            y += 18;
            drawCheckLine(graphics, x, y, "项目元数据扫描正常", true);
            y += 18;
            drawCheckLine(graphics, x, y, "服务器需安装相同 Runtime 版本", false);
            y += 18;
            drawCheckLine(graphics, x, y, "作品需包含 META-INF/gameforge/project.json", false);

            drawManualButton(
                graphics,
                mouseX,
                mouseY,
                x,
                panelY + panelH - 72,
                150,
                28,
                Component.translatable("screen.gameforge_runtime.refresh").getString(),
                ButtonKind.PRIMARY,
                this::refreshProjects
            );
        }

        private void diagnosticCard(GuiGraphics graphics, int x, int y, int width, int height, String label, String value, int color) {
            graphics.fill(x, y, x + width, y + height, CARD);
            graphics.fill(x, y, x + 3, y + height, color);
            graphics.drawString(this.font, label, x + 14, y + 14, MUTED, false);
            graphics.drawString(this.font, value, x + 14, y + 38, color, false);
        }

        private void drawCheckLine(GuiGraphics graphics, int x, int y, String text, boolean success) {
            graphics.drawString(this.font, success ? "✓" : "!", x, y, success ? SUCCESS : WARNING, false);
            graphics.drawString(this.font, text, x + 16, y, TEXT, false);
        }

        private void renderHelp(
            GuiGraphics graphics,
            int contentX,
            int panelY,
            int contentW,
            int panelH,
            int mouseX,
            int mouseY
        ) {
            int x = contentX + 22;
            int y = panelY + 66;
            int width = contentW - 44;
            graphics.fill(x, y, x + width, y + panelH - 104, 0x99141D30);
            graphics.drawString(this.font, "安装步骤", x + 18, y + 16, TEXT, false);
            int lineY = y + 40;
            String[] steps = {
                "1. 把 GameForge Runtime JAR 放进 PCL 实例的 mods 文件夹。",
                "2. 把网站生成的作品 JAR 放进同一个 mods 文件夹。",
                "3. 多人游戏时，服务端也必须安装 Runtime 和作品 JAR。",
                "4. 启动世界后按 G 打开此控制台。",
                "5. 选择作品，即可获取内容、召唤 Boss、诊断或清理。"
            };
            for (String step : steps) {
                graphics.drawString(this.font, step, x + 18, lineY, MUTED, false);
                lineY += 22;
            }

            lineY += 10;
            graphics.drawString(this.font, "为什么需要 Runtime？", x + 18, lineY, TEXT, false);
            lineY += 22;
            for (String line : new String[]{
                "• 提供统一 GUI，不再要求玩家记住 /function 命令。",
                "• 安全地在服务器执行白名单内的 GameForge 核心函数。",
                "• 自动发现作品、显示组件数量并集中运行诊断。",
                "• 后续可继续加入 JEI、依赖检查和一键安装能力。"
            }) {
                graphics.drawString(this.font, line, x + 18, lineY, MUTED, false);
                lineY += 18;
            }

            drawManualButton(
                graphics,
                mouseX,
                mouseY,
                x,
                panelY + panelH - 72,
                150,
                28,
                Component.translatable("screen.gameforge_runtime.close").getString(),
                ButtonKind.SECONDARY,
                this::onClose
            );
        }

        private void drawManualButton(
            GuiGraphics graphics,
            int mouseX,
            int mouseY,
            int x,
            int y,
            int width,
            int height,
            String label,
            ButtonKind kind,
            Runnable onClick
        ) {
            boolean hovered = inside(mouseX, mouseY, x, y, width, height);
            int base = switch (kind) {
                case PRIMARY -> hovered ? 0xFF8FB6FF : 0xFF80A9FF;
                case SUCCESS -> hovered ? 0xFF8AEBBD : SUCCESS;
                case DANGER -> hovered ? 0xFFFFA4AE : DANGER;
                case SECONDARY -> hovered ? 0xFF314566 : 0xFF263650;
            };
            int textColor = kind == ButtonKind.SECONDARY ? TEXT : 0xFF08101F;
            graphics.fill(x, y, x + width, y + height, base);
            graphics.fill(x, y + height - 2, x + width, y + height, kind == ButtonKind.SECONDARY ? BORDER : ACCENT_PURPLE);
            graphics.drawCenteredString(this.font, label, x + width / 2, y + (height - 8) / 2, textColor);
            hitBoxes.add(new HitBox(x, y, width, height, onClick));
        }

        @Override
        public boolean mouseClicked(double mouseX, double mouseY, int button) {
            if (super.mouseClicked(mouseX, mouseY, button)) {
                return true;
            }
            if (button == 0) {
                for (int index = hitBoxes.size() - 1; index >= 0; index--) {
                    HitBox hitBox = hitBoxes.get(index);
                    if (hitBox.contains(mouseX, mouseY)) {
                        hitBox.action.run();
                        return true;
                    }
                }
            }
            return false;
        }

        @Override
        public boolean mouseScrolled(double mouseX, double mouseY, double delta) {
            if (tab == Tab.PROJECTS) {
                listScroll = Math.max(0, listScroll - (int) Math.signum(delta) * 34);
                return true;
            }
            return super.mouseScrolled(mouseX, mouseY, delta);
        }

        @Override
        public boolean isPauseScreen() {
            return false;
        }

        private int[] layout() {
            int panelW = Math.min(960, Math.max(560, this.width - 28));
            int panelH = Math.min(560, Math.max(330, this.height - 28));
            int panelX = (this.width - panelW) / 2;
            int panelY = (this.height - panelH) / 2;
            int sidebarW = panelW < 720 ? 140 : 178;
            return new int[]{panelX, panelY, panelW, panelH, sidebarW};
        }

        private static boolean inside(double mouseX, double mouseY, int x, int y, int width, int height) {
            return mouseX >= x && mouseX < x + width && mouseY >= y && mouseY < y + height;
        }

        private enum ButtonKind {
            PRIMARY,
            SECONDARY,
            SUCCESS,
            DANGER
        }

        private record HitBox(int x, int y, int width, int height, Runnable action) {
            private boolean contains(double mouseX, double mouseY) {
                return inside(mouseX, mouseY, x, y, width, height);
            }
        }
    }
}
